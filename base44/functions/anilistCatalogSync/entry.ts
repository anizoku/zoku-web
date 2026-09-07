/**
 * anilistCatalogSync — Backend function for AniList → AniZoku catalog sync.
 *
 * Architecture (approved Fases 3C-2/3C-3/3C-4):
 * - ExternalMapping as identity (never fuzzy/LLM)
 * - AniList Page query with idMal_in / id_in (bulk, perPage=50)
 * - Shared policy from base44/shared/syncFieldPolicy.ts
 * - Batch processing with checkpoint/resume (SyncRun entity)
 * - Per-release audit logs (SyncLog entity)
 * - Rate limiting (700ms), retry/backoff (3 retries, exponential)
 * - Idempotency (skip already-processed, skip manual_override)
 * - Admin-only (verifies user.role === 'admin')
 *
 * dry_run semantics:
 * - dry_run=true: ZERO writes to WorkRelease, DynamicWork, AnimeEntry, ExternalMapping.
 * - SyncRun and SyncLog ARE written (observability/checkpoint) — this is intentional.
 * - dry_run=false: persists Tier 1 updates to WorkRelease and DynamicWork (main entry only).
 *
 * NO DELETE operations:
 * - This function NEVER deletes any entity record.
 * - It only creates (SyncRun, SyncLog) and updates (WorkRelease, DynamicWork when dry_run=false).
 *
 * TODO (not yet implemented):
 * - priority: parameter accepted but not used. Will be implemented for incremental sync
 *   to prioritize airing/current-season releases. Do not rely on it yet.
 *
 * Invoke from frontend:
 *   base44.functions.invoke('anilistCatalogSync', {
 *     dry_run: true,
 *     release_ids: ['id1', 'id2', ...],  // optional subset
 *     batch_size: 50,                     // clamped 1-50
 *     resume_from: 'run_xxx'              // optional checkpoint resume
 *   })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  applyTier1Policy,
  applyDynamicWorkDerivedPolicy,
  normalizeAniListToWorkRelease,
  normalizeAniListToDynamicWork,
  PROHIBITED_FIELDS,
} from '../../shared/syncFieldPolicy.ts';
import { sleep, parseRetryAfterMs, chunk, generateRunId, createCache } from '../../shared/syncUtils.ts';
import { isCategoryActive } from '../../shared/scopeConfig.ts';

// ── Constants ──
const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_DELAY_MS = 700;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;
const MAX_BATCH_SIZE = 50;
const PER_PAGE = 50;

const MEDIA_FIELDS = `
  id idMal
  title { romaji english native }
  format status season seasonYear
  episodes duration chapters
  averageScore popularity trending
  coverImage { large }
  bannerImage
  genres
`;

// ── In-memory cache (shared factory) ──
const cache = createCache(CACHE_TTL_MS);

// ── AniList client with retry/backoff (fix #3) ──
async function anilistQuery(query) {
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'AniZoku/1.0',
        },
        body: JSON.stringify({ query }),
      });

      if (res.status === 429 || res.status >= 500) {
        const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'));
        const backoffMs = retryAfterMs != null
          ? retryAfterMs
          : BACKOFF_BASE_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`AniList HTTP ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      if (json.errors) {
        throw new Error(`AniList GraphQL errors: ${JSON.stringify(json.errors)}`);
      }
      return json.data;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
      }
    }
  }
  throw lastError || new Error('AniList query failed after retries');
}

async function fetchMediaByMalIds(malIds, type) {
  const result = new Map();
  if (malIds.length === 0) return { map: result, cacheHit: false };

  const cacheKey = `mal_${type}_${malIds.slice().sort((a, b) => a - b).join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    for (const m of cached) result.set(String(m.idMal), m);
    return { map: result, cacheHit: true };
  }

  const query = `query { Page(perPage: ${PER_PAGE}) { media(idMal_in: [${malIds.join(',')}], type: ${type}) { ${MEDIA_FIELDS} } } }`;
  const data = await anilistQuery(query);
  const media = data?.Page?.media || [];

  cache.set(cacheKey, media);
  for (const m of media) result.set(String(m.idMal), m);
  return { map: result, cacheHit: false };
}

async function fetchMediaByAnilistIds(ids, type) {
  const result = new Map();
  if (ids.length === 0) return { map: result, cacheHit: false };

  const cacheKey = `anilist_${type}_${ids.slice().sort((a, b) => a - b).join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    for (const m of cached) result.set(String(m.id), m);
    return { map: result, cacheHit: true };
  }

  const query = `query { Page(perPage: ${PER_PAGE}) { media(id_in: [${ids.join(',')}], type: ${type}) { ${MEDIA_FIELDS} } } }`;
  const data = await anilistQuery(query);
  const media = data?.Page?.media || [];

  cache.set(cacheKey, media);
  for (const m of media) result.set(String(m.id), m);
  return { map: result, cacheHit: false };
}

// ── Helpers (generateRunId, chunk imported from syncUtils) ──

// ── Main handler ──
export default async function(req) {
  let run = null;
  let admin = null;
  try {
    // Parse params
    const body = await req.json();
    const dryRun = body.dry_run !== false;
    // Fix #2: clamp batch_size between 1 and 50
    const rawBatchSize = body.batch_size || 50;
    const batchSize = Math.min(Math.max(rawBatchSize, 1), MAX_BATCH_SIZE);
    const releaseIds = body.release_ids || null;
    const resumeFrom = body.resume_from || null;
    // TODO #11: priority not yet implemented
    const priority = body.priority || null;

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

    // Fix #5: load previous summary and errors for resume
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
      const runId = generateRunId();
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

    const wrMappingIndex = {};
    for (const m of allEM) {
      if (!m.work_release_id) continue;
      if (!wrMappingIndex[m.work_release_id]) wrMappingIndex[m.work_release_id] = { anilist: [], mal: [] };
      if (wrMappingIndex[m.work_release_id][m.provider]) wrMappingIndex[m.work_release_id][m.provider].push(m);
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
      const maps = wrMappingIndex[wr.id] || {};
      const anilistMap = maps.anilist?.[0];
      const malMap = maps.mal?.[0];
      const dw = dwMap[wr.group_id];
      contexts.push({
        wr, dw, malMap, anilistMap,
        mal_id: malMap ? parseInt(malMap.provider_id) : null,
        anilist_id: anilistMap ? parseInt(anilistMap.provider_id) : null,
      });
    }

    const totalReleases = contexts.length + processedIds.size;
    await admin.entities.SyncRun.update(runEntityId, {
      total_releases: totalReleases,
      last_checkpoint_at: new Date().toISOString(),
    });

    // ── 4. Group by query method (fix #8: add missing_mapping group) ──
    const groups = {
      anime_mal: [], manga_mal: [],
      anime_anilist: [], manga_anilist: [],
      missing_mapping: [],
      frozen_category: [],
    };
    for (const ctx of contexts) {
      if (!isCategoryActive(ctx.wr.category)) {
        groups.frozen_category.push(ctx);
      } else if (!ctx.mal_id && !ctx.anilist_id) {
        groups.missing_mapping.push(ctx);
      } else if (ctx.wr.category === 'manga') {
        if (ctx.mal_id) groups.manga_mal.push(ctx);
        else groups.manga_anilist.push(ctx);
      } else {
        if (ctx.mal_id) groups.anime_mal.push(ctx);
        else groups.anime_anilist.push(ctx);
      }
    }

    // ── 5. Process in batches ──
    // Fix #5: initialize counters from previous summary on resume
    let anilistCalls = prevSummary.anilist_calls || 0;
    let cacheHits = prevSummary.cache_hits || 0;
    let syncSafe = prevSummary.sync_safe || 0;
    let noChanges = prevSummary.no_changes || 0;
    let reviewRequired = prevSummary.review_required || 0;
    let idMismatch = prevSummary.id_mismatch || 0;
    let notFound = prevSummary.not_found || 0;
    let errors = prevSummary.errors || 0;
    let totalWrUpdates = prevSummary.total_wr_updates || 0;
    let totalDwUpdates = prevSummary.total_dw_updates || 0;
    let totalIgnored = prevSummary.total_ignored || 0;
    let missingMapping = prevSummary.missing_mapping || 0;
    let skippedOverride = prevSummary.skipped_override || 0;
    let skippedFrozen = prevSummary.skipped_frozen || 0;
    let batchesCompleted = resumed ? (run.batches_completed || 0) : 0;

    const allBatches = [];
    for (const [group, ctxs] of Object.entries(groups)) {
      for (const batch of chunk(ctxs, batchSize)) {
        allBatches.push({ group, contexts: batch });
      }
    }

    for (const { group, contexts: batchContexts } of allBatches) {
      batchesCompleted++;

      // ANIME_ONLY: handle frozen_category group (no AniList query, no writes)
      if (group === 'frozen_category') {
        for (const ctx of batchContexts) {
          skippedFrozen++;
          await admin.entities.SyncLog.create({
            run_id: runId, release_id: ctx.wr.id, release_slug: ctx.wr.slug,
            classification: 'SKIPPED_FROZEN_CATEGORY',
            match_valid: false,
            proposed_fields: '[]', written_fields: '[]',
            reviews: '[]', ignored: '[]', dw_updates: '[]',
            error_message: `Category ${ctx.wr.category} is not active (frozen)`,
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

      // Fix #8: handle missing_mapping group (no AniList query)
      if (group === 'missing_mapping') {
        const batchErrors = [];
        for (const ctx of batchContexts) {
          missingMapping++;
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
        // Checkpoint
        accumulatedErrors.push(...batchErrors);
        await admin.entities.SyncRun.update(runEntityId, {
          processed_release_ids: JSON.stringify([...processedIds]),
          current_batch: batchesCompleted,
          batches_completed: batchesCompleted,
          last_checkpoint_at: new Date().toISOString(),
          errors: JSON.stringify(accumulatedErrors), // Fix #7: accumulate
        });
        continue;
      }

      const batchErrors = [];

      // Query AniList
      let mediaMap = new Map();
      try {
        const ids = batchContexts.map(c => c.mal_id || c.anilist_id).filter(Boolean);
        let fetchResult;
        if (group === 'anime_mal') {
          fetchResult = await fetchMediaByMalIds(ids, 'ANIME');
        } else if (group === 'manga_mal') {
          fetchResult = await fetchMediaByMalIds(ids, 'MANGA');
        } else if (group === 'anime_anilist') {
          fetchResult = await fetchMediaByAnilistIds(ids, 'ANIME');
        } else {
          fetchResult = await fetchMediaByAnilistIds(ids, 'MANGA');
        }
        mediaMap = fetchResult.map;
        if (fetchResult.cacheHit) cacheHits++; else anilistCalls++;
      } catch (err) {
        errors += batchContexts.length;
        batchErrors.push({ batch: batchesCompleted, error: err.message });
        for (const ctx of batchContexts) {
          await admin.entities.SyncLog.create({
            run_id: runId, release_id: ctx.wr.id, release_slug: ctx.wr.slug,
            mal_id: ctx.mal_id, classification: 'ERROR', error_message: err.message,
            match_valid: false,
            proposed_fields: '[]', written_fields: '[]',
            reviews: '[]', ignored: '[]', dw_updates: '[]',
            timestamp: new Date().toISOString(),
          });
          processedIds.add(ctx.wr.id);
        }
        // Fix #7: accumulate errors
        accumulatedErrors.push(...batchErrors);
        await admin.entities.SyncRun.update(runEntityId, {
          processed_release_ids: JSON.stringify([...processedIds]),
          current_batch: batchesCompleted,
          batches_completed: batchesCompleted,
          last_checkpoint_at: new Date().toISOString(),
          errors: JSON.stringify(accumulatedErrors),
        });
        continue;
      }

      // Process each release
      const batchLogEntries = []; // Fix #4: collect logs, create after bulkUpdate
      const wrUpdates = [];
      const dwUpdates = [];

      for (const ctx of batchContexts) {
        const { wr, dw, mal_id, anilist_id } = ctx;

        // Layer 2: pre-write guard — skip frozen categories (safety net)
        if (!isCategoryActive(wr.category)) {
          skippedFrozen++;
          batchLogEntries.push({
            run_id: runId, release_id: wr.id, release_slug: wr.slug,
            classification: 'SKIPPED_FROZEN_CATEGORY',
            match_valid: false,
            proposed_fields: '[]', written_fields: '[]',
            reviews: '[]', ignored: '[]', dw_updates: '[]',
            error_message: `Category ${wr.category} is not active (frozen)`,
            timestamp: new Date().toISOString(),
          });
          processedIds.add(wr.id);
          continue;
        }

        let media = null;
        let classification = 'SYNC_SAFE';
        let matchValid = false;
        let proposedFields = [];
        let reviews = [];
        let ignored = [];
        let dwUpdateFields = [];
        let errorMessage = null;
        let wrUpdateObj = null;
        let dwUpdateObj = null;

        // Fix #1: skip manual_override
        if (wr.sync_status === 'manual_override') {
          classification = 'SKIPPED_MANUAL_OVERRIDE';
          skippedOverride++;
        } else {
          const key = mal_id ? String(mal_id) : String(anilist_id);
          media = mediaMap.get(key);

          if (!media) {
            classification = 'ANILIST_NOT_FOUND';
            notFound++;
          } else {
            // Validate identity
            if (mal_id && media.idMal) {
              matchValid = String(media.idMal) === String(mal_id);
            } else if (anilist_id) {
              matchValid = String(media.id) === String(anilist_id);
            }

            if (!matchValid) {
              classification = 'ID_MISMATCH';
              idMismatch++;
            } else {
              // Apply policy
              const normalized = normalizeAniListToWorkRelease(media);
              const result = applyTier1Policy(wr, normalized);

              proposedFields = result.updates.map(u => ({ field: u.field, action: u.action }));
              reviews = result.reviews;

              // Track ignored (score, cover_url)
              if (media.averageScore != null) {
                const anilistScore = media.averageScore / 10;
                if (Math.abs(anilistScore - (wr.score || 0)) > 0.01) {
                  totalIgnored++;
                  ignored.push({ field: 'score', reason: 'NEVER_FROM_ANILIST' });
                }
              }
              if (media.coverImage?.large && media.coverImage.large !== wr.cover_url) {
                totalIgnored++;
                ignored.push({ field: 'cover_url', reason: 'NEVER_FROM_ANILIST' });
              }

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
                  // Verify no prohibited fields
                  for (const f of Object.keys(wrUpdateObj)) {
                    if (f !== 'id' && PROHIBITED_FIELDS.includes(f)) {
                      throw new Error(`PROHIBITED_FIELD: ${f} in ${wr.slug}`);
                    }
                  }
                }

                // DynamicWork updates (only if is_main_entry)
                if (wr.is_main_entry === true && dw) {
                  const dwNorm = normalizeAniListToDynamicWork(media);
                  const dwResult = applyDynamicWorkDerivedPolicy(dw, dwNorm);
                  if (dwResult.updates.length > 0) {
                    totalDwUpdates += dwResult.updates.length;
                    dwUpdateFields = dwResult.updates.map(u => ({ field: u.field, action: u.action }));
                    if (!dryRun) {
                      dwUpdateObj = { id: dw.id };
                      for (const u of dwResult.updates) {
                        dwUpdateObj[u.field] = u.proposed;
                      }
                      for (const f of Object.keys(dwUpdateObj)) {
                        if (f !== 'id' && PROHIBITED_FIELDS.includes(f)) {
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

        // Fix #4: collect log entry with written_fields='[]' (updated after bulkUpdate)
        batchLogEntries.push({
          run_id: runId, release_id: wr.id, release_slug: wr.slug,
          mal_id: mal_id || null, anilist_id: media?.id || null,
          match_valid: matchValid, classification,
          proposed_fields: JSON.stringify(proposedFields),
          written_fields: '[]', // placeholder — set after bulkUpdate succeeds
          reviews: JSON.stringify(reviews),
          ignored: JSON.stringify(ignored),
          dw_updates: JSON.stringify(dwUpdateFields),
          error_message: errorMessage,
          timestamp: new Date().toISOString(),
          _proposedFields: proposedFields, // temp, for written_fields after bulkUpdate
        });

        if (wrUpdateObj) wrUpdates.push(wrUpdateObj);
        if (dwUpdateObj) dwUpdates.push(dwUpdateObj);

        processedIds.add(wr.id);
      }

      // Fix #4: persist writes, then update written_fields in logs
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

      // Fix #4: set written_fields only after successful bulkUpdate
      if (!dryRun && writeSuccess) {
        for (const entry of batchLogEntries) {
          if (entry.classification === 'SYNC_SAFE') {
            entry.written_fields = JSON.stringify(entry._proposedFields);
          }
        }
      }

      // Create SyncLog entries (after bulkUpdate)
      for (const entry of batchLogEntries) {
        delete entry._proposedFields; // cleanup temp field
        await admin.entities.SyncLog.create(entry);
      }

      // Fix #7: accumulate errors across batches
      accumulatedErrors.push(...batchErrors);

      // Checkpoint
      await admin.entities.SyncRun.update(runEntityId, {
        processed_release_ids: JSON.stringify([...processedIds]),
        current_batch: batchesCompleted,
        batches_completed: batchesCompleted,
        last_checkpoint_at: new Date().toISOString(),
        errors: JSON.stringify(accumulatedErrors),
      });

      // Rate limit delay
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    // ── 6. Finalize ──
    const durationSeconds = (Date.now() - startTime) / 1000;
    const summary = {
      sync_safe: syncSafe, no_changes: noChanges, review_required: reviewRequired,
      id_mismatch: idMismatch, not_found: notFound, errors,
      total_wr_updates: totalWrUpdates, total_dw_updates: totalDwUpdates,
      total_ignored: totalIgnored,
      missing_mapping: missingMapping, skipped_override: skippedOverride,
      skipped_frozen: skippedFrozen,
      anilist_calls: anilistCalls, cache_hits: cacheHits,
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
      anilist_not_found: notFound,
      missing_mapping: missingMapping,
      skipped_override: skippedOverride,
      skipped_frozen: skippedFrozen,
      errors,
      total_wr_updates: totalWrUpdates,
      total_dw_updates: totalDwUpdates,
      total_ignored: totalIgnored,
      anilist_calls: anilistCalls,
      cache_hits: cacheHits,
      duration_seconds: durationSeconds,
      batches_completed: batchesCompleted,
      resumed,
    });
  } catch (error) {
    // Fix #6: mark SyncRun as failed before returning 500
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