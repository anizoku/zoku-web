/**
 * malCatalogSync — Backend function for MAL/Jikan → AniZoku catalog sync (Fase 3D-1).
 *
 * Architecture (mirrors anilistCatalogSync, adapted for Jikan REST API):
 * - ExternalMapping provider="mal" as identity (never fuzzy/LLM/title matching)
 * - Jikan as access to MAL metadata; MAL ID is the identity
 * - AniZoku DB remains canonical
 * - Shared policy from base44/shared/syncFieldPolicy.ts (MAL-specific appliers)
 * - Shared utilities from base44/shared/syncUtils.ts
 * - Batch processing with checkpoint/resume (SyncRun entity)
 * - Per-release audit logs (SyncLog entity)
 * - Rate limiting (1200ms), retry/backoff (5 retries, exponential), global cooldown on 429
 * - Idempotency (skip already-processed, skip manual_override)
 * - Admin-only (verifies user.role === 'admin')
 *
 * MAL/Jikan authorized WorkRelease fields (Fase 3D-1):
 * - score, cover_url, episode_count, chapter_count, duration_minutes, status
 *
 * DynamicWork: only denormalized fields from main entry (score, episodes,
 * anime_status, franchise_poster_url, popularity_rank) when is_main_entry=true.
 * franchise_score (admin override) is NEVER touched.
 *
 * dry_run semantics (same as anilistCatalogSync):
 * - dry_run=true: ZERO writes to WorkRelease, DynamicWork.
 * - SyncRun and SyncLog ARE written (observability/checkpoint).
 * - dry_run=false: persists updates (NOT executed in this phase).
 *
 * NO DELETE operations.
 *
 * Invoke from frontend:
 *   base44.functions.invoke('malCatalogSync', {
 *     dry_run: true,
 *     release_ids: ['id1', ...],
 *     batch_size: 50,
 *     resume_from: 'run_mal_xxx'
 *   })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  applyMalTier1Policy,
  applyMalDynamicWorkDerivedPolicy,
  normalizeJikanToWorkRelease,
  normalizeJikanToDynamicWork,
  MAL_PROHIBITED_FIELDS,
} from '../../shared/syncFieldPolicy.ts';
import { sleep, parseRetryAfterMs, chunk, generateRunId, createCache } from '../../shared/syncUtils.ts';
import { isCategoryFrozen, ANIME_ONLY_MODE } from '../../shared/scopeConfig.ts';

// ── Constants ──
const JIKAN_BASE = 'https://api.jikan.moe/v4';
const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_DELAY_MS = 1200;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 2000;
const MAX_BATCH_SIZE = 50;
const RETRY_AFTER_BUFFER_MS = 1000;
const GLOBAL_COOLDOWN_MIN_MS = 10000;

// ── In-memory cache (shared factory) ──
const cache = createCache(CACHE_TTL_MS);

// ── Jikan client with conservative retry/backoff (5 retries, Retry-After + buffer, 429 tracking) ──
async function jikanFetch(type, malId) {
  const cacheKey = `jikan_${type}_${malId}`;
  const cached = cache.get(cacheKey);
  if (cached !== null) return { data: cached, cacheHit: false, rateLimited: false, hit429: false, retryAfterMs: null, error: null };

  let lastError = null;
  let wasRateLimited = false;
  let hit429 = false;
  let lastRetryAfterMs = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${JIKAN_BASE}/${type}/${malId}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AniZoku/1.0',
        },
      });

      if (res.status === 404) {
        return { data: null, cacheHit: false, rateLimited: false, hit429, retryAfterMs: lastRetryAfterMs, error: null };
      }

      if (res.status === 429) {
        hit429 = true;
        wasRateLimited = true;
        const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'));
        if (retryAfterMs != null) lastRetryAfterMs = retryAfterMs;
        // Respect Retry-After + 1000ms buffer; never retry before that period
        const backoffMs = retryAfterMs != null
          ? retryAfterMs + RETRY_AFTER_BUFFER_MS
          : BACKOFF_BASE_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
        continue;
      }

      if (res.status >= 500) {
        wasRateLimited = false;
        const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Jikan HTTP ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const data = json.data || null;
      if (data) cache.set(cacheKey, data);
      return { data, cacheHit: false, rateLimited: false, hit429, retryAfterMs: lastRetryAfterMs, error: null };
    } catch (err) {
      lastError = err;
      wasRateLimited = false;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
      }
    }
  }

  // All retries exhausted — classify by final state
  if (wasRateLimited) {
    return { data: null, cacheHit: false, rateLimited: true, hit429, retryAfterMs: lastRetryAfterMs, error: null };
  }
  return { data: null, cacheHit: false, rateLimited: false, hit429, retryAfterMs: lastRetryAfterMs, error: lastError?.message || 'Jikan query failed after retries' };
}

function getJikanType(category) {
  if (category === 'manga') return 'manga';
  return 'anime';
}

// generateRunId, chunk imported from syncUtils

// ── Main handler ──
export default async function(req) {
  let run = null;
  let admin = null;
  try {
    const body = await req.json();
    const dryRun = body.dry_run !== false;
    const rawBatchSize = body.batch_size || 50;
    const batchSize = Math.min(Math.max(rawBatchSize, 1), MAX_BATCH_SIZE);
    const releaseIds = body.release_ids || null;
    const resumeFrom = body.resume_from || null;

    // Auth — admin only
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    admin = base44.asServiceRole;
    const startTime = Date.now();

    // ── 1. Load or create SyncRun (checkpoint/resume) ──
    let resumed = false;
    let processedIds = new Set();
    let prevSummary = {};
    let accumulatedErrors = [];

    if (resumeFrom) {
      const existing = await admin.entities.SyncRun.filter({ run_id: resumeFrom });
      if (existing.length > 0) {
        run = existing[0];
        resumed = true;
        try { processedIds = new Set(JSON.parse(run.processed_release_ids || '[]')); } catch {}
        try { prevSummary = JSON.parse(run.summary || '{}'); } catch {}
        try { accumulatedErrors = JSON.parse(run.errors || '[]'); } catch {}
      }
    }

    if (!run) {
      const runId = generateRunId('run_mal');
      run = await admin.entities.SyncRun.create({
        run_id: runId,
        dry_run: dryRun,
        started_at: new Date().toISOString(),
        status: 'running',
        total_releases: 0,
        processed_release_ids: '[]',
        current_batch: 0,
        batches_completed: 0,
        errors: '[]',
        last_checkpoint_at: new Date().toISOString(),
        summary: '{}',
      });
    }

    const runId = run.run_id;
    const runEntityId = run.id;

    // ── 2. Load data ──
    const allWR = await admin.entities.WorkRelease.list('-created_date', 5000);
    const allDW = await admin.entities.DynamicWork.list('-created_date', 5000);
    const allEM = await admin.entities.ExternalMapping.list('-created_date', 5000);

    const dwMap = {};
    for (const dw of allDW) dwMap[dw.id] = dw;

    const wrMalMappingIndex = {};
    for (const m of allEM) {
      if (m.provider !== 'mal') continue;
      if (!m.work_release_id) continue;
      wrMalMappingIndex[m.work_release_id] = m;
    }

    // ── 3. Filter eligible releases ──
    let eligible = allWR;
    if (releaseIds && releaseIds.length > 0) {
      eligible = allWR.filter(r => releaseIds.includes(r.id));
    }
    eligible = eligible.filter(r => !processedIds.has(r.id));

    // Build release contexts
    const contexts = [];
    for (const wr of eligible) {
      const malMap = wrMalMappingIndex[wr.id];
      const dw = dwMap[wr.group_id];
      contexts.push({
        wr, dw, malMap,
        mal_id: malMap ? parseInt(malMap.provider_id) : null,
      });
    }

    const totalReleases = contexts.length + processedIds.size;
    await admin.entities.SyncRun.update(runEntityId, {
      total_releases: totalReleases,
      last_checkpoint_at: new Date().toISOString(),
    });

    // ── 4. Group: with_mapping vs missing_mapping vs frozen_category ──
    const withMapping = [];
    const missingMapping = [];
    const frozenCategory = [];
    for (const ctx of contexts) {
      if (ANIME_ONLY_MODE && isCategoryFrozen(ctx.wr.category)) {
        frozenCategory.push(ctx);
      } else if (!ctx.mal_id) {
        missingMapping.push(ctx);
      } else {
        withMapping.push(ctx);
      }
    }

    // ── 5. Process in batches ──
    let jikanCalls = prevSummary.jikan_calls || 0;
    let cacheHits = prevSummary.cache_hits || 0;
    let syncSafe = prevSummary.sync_safe || 0;
    let noChanges = prevSummary.no_changes || 0;
    let reviewRequired = prevSummary.review_required || 0;
    let idMismatch = prevSummary.id_mismatch || 0;
    let notFound = prevSummary.not_found || 0;
    let errors = prevSummary.errors || 0;
    let totalWrUpdates = prevSummary.total_wr_updates || 0;
    let totalDwUpdates = prevSummary.total_dw_updates || 0;
    let missingMappingCount = prevSummary.missing_mapping || 0;
    let skippedOverride = prevSummary.skipped_override || 0;
    let skippedFrozen = prevSummary.skipped_frozen || 0;
    let upstreamRateLimited = prevSummary.upstream_rate_limited || 0;
    let batchesCompleted = resumed ? (run.batches_completed || 0) : 0;
    let globalCooldownUntil = 0;

    const allBatches = [];
    for (const batch of chunk(withMapping, batchSize)) {
      allBatches.push({ group: 'with_mapping', contexts: batch });
    }
    if (missingMapping.length > 0) {
      allBatches.push({ group: 'missing_mapping', contexts: missingMapping });
    }
    if (frozenCategory.length > 0) {
      allBatches.push({ group: 'frozen_category', contexts: frozenCategory });
    }

    for (const { group, contexts: batchContexts } of allBatches) {
      batchesCompleted++;

      // ── frozen_category: no Jikan query, no writes (ANIME_ONLY mode) ──
      if (group === 'frozen_category') {
        for (const ctx of batchContexts) {
          skippedFrozen++;
          await admin.entities.SyncLog.create({
            run_id: runId, release_id: ctx.wr.id, release_slug: ctx.wr.slug,
            classification: 'SKIPPED_FROZEN_CATEGORY',
            match_valid: false,
            proposed_fields: '[]', written_fields: '[]',
            reviews: '[]', ignored: '[]', dw_updates: '[]',
            error_message: `Category ${ctx.wr.category} is frozen (ANIME_ONLY mode)`,
            timestamp: new Date().toISOString(),
          });
          processedIds.add(ctx.wr.id);
        }
        await admin.entities.SyncRun.update(runEntityId, {
          processed_release_ids: JSON.stringify([...processedIds]),
          current_batch: batchesCompleted,
          batches_completed: batchesCompleted,
          last_checkpoint_at: new Date().toISOString(),
          errors: JSON.stringify(accumulatedErrors),
        });
        continue;
      }

      // ── missing_mapping: no Jikan query ──
      if (group === 'missing_mapping') {
        for (const ctx of batchContexts) {
          missingMappingCount++;
          await admin.entities.SyncLog.create({
            run_id: runId, release_id: ctx.wr.id, release_slug: ctx.wr.slug,
            classification: 'MISSING_MAPPING',
            match_valid: false,
            proposed_fields: '[]', written_fields: '[]',
            reviews: '[]', ignored: '[]', dw_updates: '[]',
            timestamp: new Date().toISOString(),
          });
          processedIds.add(ctx.wr.id);
        }
        await admin.entities.SyncRun.update(runEntityId, {
          processed_release_ids: JSON.stringify([...processedIds]),
          current_batch: batchesCompleted,
          batches_completed: batchesCompleted,
          last_checkpoint_at: new Date().toISOString(),
          errors: JSON.stringify(accumulatedErrors),
        });
        continue;
      }

      // ── with_mapping: sequential Jikan requests ──
      const batchErrors = [];
      const batchLogEntries = [];
      const wrUpdates = [];
      const dwUpdates = [];

      for (const ctx of batchContexts) {
        const { wr, dw, mal_id } = ctx;

        // Layer 2: pre-write guard — skip frozen categories (safety net)
        if (ANIME_ONLY_MODE && isCategoryFrozen(wr.category)) {
          skippedFrozen++;
          batchLogEntries.push({
            run_id: runId, release_id: wr.id, release_slug: wr.slug,
            mal_id: mal_id || null,
            classification: 'SKIPPED_FROZEN_CATEGORY',
            match_valid: false,
            proposed_fields: '[]', written_fields: '[]',
            reviews: '[]', ignored: '[]', dw_updates: '[]',
            error_message: `Category ${wr.category} is frozen (ANIME_ONLY mode)`,
            timestamp: new Date().toISOString(),
          });
          processedIds.add(wr.id);
          continue;
        }

        let jikanData = null;
        let classification = 'SYNC_SAFE';
        let matchValid = false;
        let proposedFields = [];
        let reviews = [];
        let ignored = [];
        let dwUpdateFields = [];
        let errorMessage = null;
        let wrUpdateObj = null;
        let dwUpdateObj = null;

        // manual_override protection
        if (wr.sync_status === 'manual_override') {
          classification = 'SKIPPED_MANUAL_OVERRIDE';
          skippedOverride++;
        } else {
          // Global cooldown check (if a previous request hit 429)
          if (Date.now() < globalCooldownUntil) {
            await sleep(globalCooldownUntil - Date.now());
          }

          try {
            const type = getJikanType(wr.category);
            const fetchResult = await jikanFetch(type, mal_id);

            // Apply global cooldown if any 429 was encountered (even if eventually succeeded)
            if (fetchResult.hit429 || fetchResult.rateLimited) {
              const cooldownMs = fetchResult.retryAfterMs != null
                ? fetchResult.retryAfterMs + RETRY_AFTER_BUFFER_MS
                : GLOBAL_COOLDOWN_MIN_MS;
              globalCooldownUntil = Date.now() + cooldownMs;
            }

            if (fetchResult.cacheHit) cacheHits++; else jikanCalls++;

            // Rate-limited: all retries exhausted by 429 — NOT a permanent ERROR
            if (fetchResult.rateLimited) {
              classification = 'UPSTREAM_RATE_LIMITED';
              upstreamRateLimited++;
              // NOT added to processedIds — retryable in future run/resume
            } else if (fetchResult.error) {
              classification = 'ERROR';
              errorMessage = fetchResult.error;
              errors++;
              batchErrors.push({ batch: batchesCompleted, release: wr.slug, error: fetchResult.error });
            } else {
              jikanData = fetchResult.data;

              if (!jikanData) {
                classification = 'MAL_NOT_FOUND';
                notFound++;
              } else {
                // Validate identity (MAL ID returned must match the mapping)
                matchValid = jikanData.mal_id === mal_id;

                if (!matchValid) {
                  classification = 'ID_MISMATCH';
                  idMismatch++;
                } else {
                  // Apply MAL Tier 1 policy
                  const normalized = normalizeJikanToWorkRelease(jikanData);
                  const result = applyMalTier1Policy(wr, normalized);

                  proposedFields = result.updates.map(u => ({ field: u.field, action: u.action }));
                  reviews = result.reviews;

                  if (reviews.length > 0) {
                    classification = 'REVIEW_REQUIRED';
                    reviewRequired++;
                  } else if (result.updates.length === 0) {
                    classification = 'NO_CHANGES';
                    noChanges++;
                  } else {
                    classification = 'SYNC_SAFE';
                    syncSafe++;
                    totalWrUpdates += result.updates.length;

                    // Prepare WR update (only if dry_run=false)
                    if (!dryRun) {
                      wrUpdateObj = { id: wr.id };
                      for (const u of result.updates) {
                        wrUpdateObj[u.field] = u.proposed;
                      }
                      for (const f of Object.keys(wrUpdateObj)) {
                        if (f !== 'id' && MAL_PROHIBITED_FIELDS.includes(f)) {
                          throw new Error(`PROHIBITED_FIELD: ${f} in ${wr.slug}`);
                        }
                      }
                    }

                    // DynamicWork updates (only if is_main_entry)
                    if (wr.is_main_entry === true && dw) {
                      const dwNorm = normalizeJikanToDynamicWork(jikanData, wr.category);
                      const dwResult = applyMalDynamicWorkDerivedPolicy(dw, dwNorm);
                      if (dwResult.updates.length > 0) {
                        totalDwUpdates += dwResult.updates.length;
                        dwUpdateFields = dwResult.updates.map(u => ({ field: u.field, action: u.action }));
                        if (!dryRun) {
                          dwUpdateObj = { id: dw.id };
                          for (const u of dwResult.updates) {
                            dwUpdateObj[u.field] = u.proposed;
                          }
                          for (const f of Object.keys(dwUpdateObj)) {
                            if (f !== 'id' && MAL_PROHIBITED_FIELDS.includes(f)) {
                              throw new Error(`PROHIBITED_FIELD: ${f} in DW ${dw.slug}`);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            classification = 'ERROR';
            errorMessage = err.message;
            errors++;
            batchErrors.push({ batch: batchesCompleted, release: wr.slug, error: err.message });
          }
        }

        batchLogEntries.push({
          run_id: runId, release_id: wr.id, release_slug: wr.slug,
          mal_id: mal_id || null,
          match_valid: matchValid, classification,
          proposed_fields: JSON.stringify(proposedFields),
          written_fields: '[]',
          reviews: JSON.stringify(reviews),
          ignored: JSON.stringify(ignored),
          dw_updates: JSON.stringify(dwUpdateFields),
          error_message: errorMessage,
          timestamp: new Date().toISOString(),
          _proposedFields: proposedFields,
        });

        if (wrUpdateObj) wrUpdates.push(wrUpdateObj);
        if (dwUpdateObj) dwUpdates.push(dwUpdateObj);

        // UPSTREAM_RATE_LIMITED is NOT definitively processed — retryable in future run/resume
        if (classification !== 'UPSTREAM_RATE_LIMITED') {
          processedIds.add(wr.id);
        }

        // Rate limit between Jikan requests
        await sleep(RATE_LIMIT_DELAY_MS);
      }

      // Persist writes (only if dry_run=false)
      let writeSuccess = true;
      if (!dryRun && wrUpdates.length > 0) {
        try {
          await admin.entities.WorkRelease.bulkUpdate(wrUpdates);
        } catch (err) {
          writeSuccess = false;
          errors += wrUpdates.length;
          batchErrors.push({ batch: batchesCompleted, error: `WR bulkUpdate: ${err.message}` });
        }
      }
      if (!dryRun && dwUpdates.length > 0 && writeSuccess) {
        try {
          await admin.entities.DynamicWork.bulkUpdate(dwUpdates);
        } catch (err) {
          writeSuccess = false;
          errors += dwUpdates.length;
          batchErrors.push({ batch: batchesCompleted, error: `DW bulkUpdate: ${err.message}` });
        }
      }

      // Set written_fields only after successful bulkUpdate
      if (!dryRun && writeSuccess) {
        for (const entry of batchLogEntries) {
          if (entry.classification === 'SYNC_SAFE') {
            entry.written_fields = JSON.stringify(entry._proposedFields);
          }
        }
      }

      // Create SyncLog entries
      for (const entry of batchLogEntries) {
        delete entry._proposedFields;
        await admin.entities.SyncLog.create(entry);
      }

      accumulatedErrors.push(...batchErrors);

      // Checkpoint
      await admin.entities.SyncRun.update(runEntityId, {
        processed_release_ids: JSON.stringify([...processedIds]),
        current_batch: batchesCompleted,
        batches_completed: batchesCompleted,
        last_checkpoint_at: new Date().toISOString(),
        errors: JSON.stringify(accumulatedErrors),
      });
    }

    // ── 6. Finalize ──
    const durationSeconds = (Date.now() - startTime) / 1000;
    const summary = {
      sync_safe: syncSafe, no_changes: noChanges, review_required: reviewRequired,
      id_mismatch: idMismatch, not_found: notFound, errors,
      total_wr_updates: totalWrUpdates, total_dw_updates: totalDwUpdates,
      missing_mapping: missingMappingCount, skipped_override: skippedOverride,
      skipped_frozen: skippedFrozen,
      upstream_rate_limited: upstreamRateLimited,
      jikan_calls: jikanCalls, cache_hits: cacheHits,
    };

    await admin.entities.SyncRun.update(runEntityId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      last_checkpoint_at: new Date().toISOString(),
      summary: JSON.stringify(summary),
      errors: JSON.stringify(accumulatedErrors),
    });

    return Response.json({
      run_id: runId,
      dry_run: dryRun,
      total_releases: totalReleases,
      processed: processedIds.size,
      sync_safe: syncSafe,
      no_changes: noChanges,
      review_required: reviewRequired,
      id_mismatch: idMismatch,
      mal_not_found: notFound,
      missing_mapping: missingMappingCount,
      skipped_override: skippedOverride,
      skipped_frozen: skippedFrozen,
      upstream_rate_limited: upstreamRateLimited,
      errors,
      total_wr_updates: totalWrUpdates,
      total_dw_updates: totalDwUpdates,
      jikan_calls: jikanCalls,
      cache_hits: cacheHits,
      duration_seconds: durationSeconds,
      batches_completed: batchesCompleted,
      resumed,
    });
  } catch (error) {
    if (admin && run) {
      try {
        await admin.entities.SyncRun.update(run.id, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          last_checkpoint_at: new Date().toISOString(),
          errors: JSON.stringify([{ error: error.message }]),
        });
      } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}