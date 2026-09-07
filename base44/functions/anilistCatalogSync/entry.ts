/**
 * anilistCatalogSync — Backend function for AniList → AniZoku catalog sync.
 *
 * Architecture (approved Fases 3C-2/3C-3/3C-4):
 * - ExternalMapping as identity (never fuzzy/LLM)
 * - AniList Page query with idMal_in / id_in (bulk)
 * - Shared policy from base44/shared/syncFieldPolicy.ts
 * - Batch processing with checkpoint/resume (SyncRun entity)
 * - Per-release audit logs (SyncLog entity)
 * - Rate limiting (700ms), retry/backoff (3 retries, exponential)
 * - Idempotency (skip already-processed, skip manual_override)
 * - dry_run mode (zero writes)
 * - Admin-only (verifies user.role === 'admin')
 *
 * Invoke from frontend:
 *   base44.functions.invoke('anilistCatalogSync', {
 *     dry_run: true,
 *     release_ids: ['id1', 'id2', ...]  // optional subset
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

// ── Constants ──
const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_DELAY_MS = 700;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;

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

// ── In-memory cache ──
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  if (entry) cache.delete(key);
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── AniList client with retry/backoff ──
async function anilistQuery(query) {
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '0') ||
          (BACKOFF_BASE_MS * Math.pow(2, attempt));
        await sleep(retryAfter);
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
  if (malIds.length === 0) return result;

  const cacheKey = `mal_${type}_${malIds.slice().sort((a, b) => a - b).join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) {
    for (const m of cached) result.set(String(m.idMal), m);
    return { map: result, cacheHit: true };
  }

  const query = `query { Page(perPage: 50) { media(idMal_in: [${malIds.join(',')}], type: ${type}) { ${MEDIA_FIELDS} } } }`;
  const data = await anilistQuery(query);
  const media = data?.Page?.media || [];

  setCached(cacheKey, media);
  for (const m of media) result.set(String(m.idMal), m);
  return { map: result, cacheHit: false };
}

async function fetchMediaByAnilistIds(ids, type) {
  const result = new Map();
  if (ids.length === 0) return result;

  const cacheKey = `anilist_${type}_${ids.slice().sort((a, b) => a - b).join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) {
    for (const m of cached) result.set(String(m.id), m);
    return { map: result, cacheHit: true };
  }

  const query = `query { Page(perPage: 50) { media(id_in: [${ids.join(',')}], type: ${type}) { ${MEDIA_FIELDS} } } }`;
  const data = await anilistQuery(query);
  const media = data?.Page?.media || [];

  setCached(cacheKey, media);
  for (const m of media) result.set(String(m.id), m);
  return { map: result, cacheHit: false };
}

// ── Helpers ──
function generateRunId() {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Main handler ──
export default async function(req) {
  try {
    // Parse params
    const body = await req.json();
    const dryRun = body.dry_run !== false;
    const batchSize = body.batch_size || 50;
    const releaseIds = body.release_ids || null;
    const resumeFrom = body.resume_from || null;

    // Auth — admin only
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const admin = base44.asServiceRole;
    const startTime = Date.now();

    // ── 1. Load or create SyncRun (checkpoint/resume) ──
    let run = null;
    let resumed = false;
    let processedIds = new Set();

    if (resumeFrom) {
      const existing = await admin.entities.SyncRun.filter({ run_id: resumeFrom });
      if (existing.length > 0) {
        run = existing[0];
        resumed = true;
        try { processedIds = new Set(JSON.parse(run.processed_release_ids || '[]')); } catch {}
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
    await admin.entities.SyncRun.update(run.id, {
      total_releases: totalReleases,
      last_checkpoint_at: new Date().toISOString(),
    });

    // ── 4. Group by query method ──
    const groups = { anime_mal: [], manga_mal: [], anime_anilist: [], manga_anilist: [] };
    for (const ctx of contexts) {
      if (ctx.wr.category === 'manga') {
        if (ctx.mal_id) groups.manga_mal.push(ctx);
        else if (ctx.anilist_id) groups.manga_anilist.push(ctx);
      } else {
        if (ctx.mal_id) groups.anime_mal.push(ctx);
        else if (ctx.anilist_id) groups.anime_anilist.push(ctx);
      }
    }

    // ── 5. Process in batches ──
    let anilistCalls = 0, cacheHits = 0;
    let syncSafe = 0, noChanges = 0, reviewRequired = 0, idMismatch = 0, notFound = 0, errors = 0;
    let totalWrUpdates = 0, totalDwUpdates = 0, totalIgnored = 0;
    let batchesCompleted = resumed ? (run.batches_completed || 0) : 0;

    const allBatches = [];
    for (const [group, ctxs] of Object.entries(groups)) {
      for (const batch of chunk(ctxs, batchSize)) {
        allBatches.push({ group, contexts: batch });
      }
    }

    for (const { group, contexts: batchContexts } of allBatches) {
      batchesCompleted++;
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
            timestamp: new Date().toISOString(),
          });
        }
        continue;
      }

      // Process each release
      const wrUpdates = [];
      const dwUpdates = [];

      for (const ctx of batchContexts) {
        const { wr, dw, mal_id, anilist_id } = ctx;
        const key = mal_id ? String(mal_id) : String(anilist_id);
        const media = mediaMap.get(key);

        let classification = 'SYNC_SAFE';
        let matchValid = false;
        let proposedFields = [];
        let reviews = [];
        let ignored = [];
        let dwUpdateFields = [];
        let errorMessage = null;

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
                const updateObj = { id: wr.id };
                for (const u of result.updates) {
                  updateObj[u.field] = u.proposed;
                }
                // Verify no prohibited fields
                for (const f of Object.keys(updateObj)) {
                  if (f !== 'id' && PROHIBITED_FIELDS.includes(f)) {
                    throw new Error(`PROHIBITED_FIELD: ${f} in ${wr.slug}`);
                  }
                }
                wrUpdates.push(updateObj);
              }

              // DynamicWork updates (only if is_main_entry)
              if (wr.is_main_entry === true && dw) {
                const dwNorm = normalizeAniListToDynamicWork(media);
                const dwResult = applyDynamicWorkDerivedPolicy(dw, dwNorm);
                if (dwResult.updates.length > 0) {
                  totalDwUpdates += dwResult.updates.length;
                  dwUpdateFields = dwResult.updates.map(u => ({ field: u.field, action: u.action }));
                  if (!dryRun) {
                    const dwObj = { id: dw.id };
                    for (const u of dwResult.updates) {
                      dwObj[u.field] = u.proposed;
                    }
                    for (const f of Object.keys(dwObj)) {
                      if (f !== 'id' && PROHIBITED_FIELDS.includes(f)) {
                        throw new Error(`PROHIBITED_FIELD: ${f} in DW ${dw.slug}`);
                      }
                    }
                    dwUpdates.push(dwObj);
                  }
                }
              }
            }
          }
        }

        // Create SyncLog
        await admin.entities.SyncLog.create({
          run_id: runId, release_id: wr.id, release_slug: wr.slug,
          mal_id: mal_id || null, anilist_id: media?.id || null,
          match_valid: matchValid, classification,
          proposed_fields: JSON.stringify(proposedFields),
          written_fields: dryRun ? '[]' : JSON.stringify(proposedFields),
          reviews: JSON.stringify(reviews),
          ignored: JSON.stringify(ignored),
          dw_updates: JSON.stringify(dwUpdateFields),
          error_message: errorMessage,
          timestamp: new Date().toISOString(),
        });

        processedIds.add(wr.id);
      }

      // Persist writes (only if dry_run=false)
      if (!dryRun && wrUpdates.length > 0) {
        await admin.entities.WorkRelease.bulkUpdate(wrUpdates);
      }
      if (!dryRun && dwUpdates.length > 0) {
        await admin.entities.DynamicWork.bulkUpdate(dwUpdates);
      }

      // Checkpoint
      await admin.entities.SyncRun.update(run.id, {
        processed_release_ids: JSON.stringify([...processedIds]),
        current_batch: batchesCompleted,
        batches_completed: batchesCompleted,
        last_checkpoint_at: new Date().toISOString(),
        errors: JSON.stringify(batchErrors),
      });

      // Rate limit delay
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    // ── 6. Finalize ──
    const durationSeconds = (Date.now() - startTime) / 1000;
    const summary = {
      sync_safe: syncSafe, no_changes: noChanges, review_required: reviewRequired,
      id_mismatch: idMismatch, not_found: notFound, errors,
      total_wr_updates: totalWrUpdates, total_dw_updates: totalDwUpdates, total_ignored: totalIgnored,
    };

    await admin.entities.SyncRun.update(run.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      last_checkpoint_at: new Date().toISOString(),
      summary: JSON.stringify(summary),
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}