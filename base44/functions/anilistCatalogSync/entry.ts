import { createClientFromRequest } from "npm:@base44/sdk";
import {
  applyDynamicWorkDerivedPolicy,
  applyTier1Policy,
  ALLOWED_DYNAMIC_WORK_TIER1,
  ALLOWED_WORK_RELEASE_TIER1,
  filterAllowedUpdates,
  findProhibitedUpdates,
  normalizeAniListToDynamicWork,
  normalizeAniListToWorkRelease,
  PROHIBITED_DYNAMIC_WORK_FIELDS,
  PROHIBITED_WORK_RELEASE_FIELDS,
} from "../../shared/syncFieldPolicy.ts";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const PAGE_SIZE = 50;
const DEFAULT_BATCH_SIZE = 50;
const REGRESSION_MAL_IDS = [31240, 57334, 11061, 16498, 39535, 52211, 20, 1535, 22319, 21, 269];

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  format
  status
  season
  seasonYear
  episodes
  chapters
  volumes
  duration
  genres
  averageScore
  meanScore
  popularity
  trending
  coverImage { large extraLarge }
  bannerImage
  siteUrl
`;

const PAGE_QUERY = `
  query ($page: Int, $perPage: Int, $id_in: [Int], $idMal_in: [Int], $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage currentPage }
      media(id_in: $id_in, idMal_in: $idMal_in, type: $type) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value: any, fallback: any) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniqueNums(values: any[]) {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const v of values) {
    const n = Number(v);
    if (!Number.isFinite(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function anilistTypeFor(release: any, mapping: any) {
  const t = String(mapping?.provider_type || release?.category || "").toLowerCase();
  return t === "manga" ? "MANGA" : "ANIME";
}

function mappingsForRelease(release: any, byRelease: Map<string, any[]>, byGroup: Map<string, any[]>) {
  const releaseMaps = byRelease.get(release.id) || [];
  const groupMaps = byGroup.get(release.group_id) || [];
  const anilist =
    releaseMaps.find((m) => m.provider === "anilist") ||
    groupMaps.find((m) => m.provider === "anilist" && !m.work_release_id) ||
    null;
  const mal =
    releaseMaps.find((m) => m.provider === "mal") ||
    groupMaps.find((m) => m.provider === "mal" && !m.work_release_id) ||
    null;
  return { anilist, mal };
}

async function anilistRequest(query: string, variables: any, stats: any) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    stats.anilist_calls += 1;
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 429 || res.status >= 500) {
      stats.retries += 1;
      lastError = new Error(`AniList HTTP ${res.status}`);
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AniList API ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(`AniList GraphQL error: ${json.errors.map((e: any) => e.message).join("; ")}`);
    }
    return json.data;
  }
  throw lastError || new Error("AniList request failed");
}

async function fetchAniListGroup(type: string, ids: number[], kind: "id" | "idMal", stats: any) {
  const byId = new Map<number, any>();
  const byMal = new Map<number, any>();
  if (!ids.length) return { byId, byMal };
  for (const part of chunk(ids, PAGE_SIZE)) {
    let page = 1;
    let hasNext = true;
    while (hasNext) {
      const variables: any = { page, perPage: PAGE_SIZE, type };
      if (kind === "id") variables.id_in = part;
      else variables.idMal_in = part;
      const data = await anilistRequest(PAGE_QUERY, variables, stats);
      const media = data?.Page?.media || [];
      for (const m of media) {
        if (m?.id != null) byId.set(Number(m.id), m);
        if (m?.idMal != null) byMal.set(Number(m.idMal), m);
      }
      hasNext = Boolean(data?.Page?.pageInfo?.hasNextPage);
      page += 1;
      if (media.length < PAGE_SIZE) hasNext = false;
    }
  }
  return { byId, byMal };
}

function classifyResult(row: any) {
  if (row.classification) return row.classification;
  if (row.reviews?.length) return "REVIEW_REQUIRED";
  if (row.updates?.length || row.dw_updates?.length) return "SYNC_SAFE";
  return "NO_CHANGES";
}

function ignoredProtected(release: any, media: any) {
  const ignored: any[] = [];
  if (!media) return ignored;
  const anilistScore = media.averageScore != null ? media.averageScore / 10 : null;
  const anilistCover = media.coverImage?.large || media.coverImage?.extraLarge || null;
  if (anilistScore != null) {
    ignored.push({
      field: "score",
      reason: "NEVER_FROM_ANILIST",
      current: release.score ?? null,
      proposed: anilistScore,
    });
  }
  if (anilistCover) {
    ignored.push({
      field: "cover_url",
      reason: "NEVER_FROM_ANILIST",
      current: release.cover_url ?? null,
      proposed: "[anilist cover omitted]",
    });
  }
  return ignored;
}

function wouldCreateAnilistMapping(mal: any, anilist: any, media: any) {
  if (anilist) return false;
  if (!mal || !media?.id) return false;
  return true;
}

async function loadAll(db: any, entity: string) {
  const all: any[] = [];
  let skip = 0;
  const limit = 5000;
  while (true) {
    const page = await db.entities[entity].list("-created_date", limit, skip);
    all.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }
  return all;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false;
    const release_ids: string[] | undefined = Array.isArray(body.release_ids) ? body.release_ids.map(String) : undefined;
    const batch_size = Math.max(1, Math.min(Number(body.batch_size) || DEFAULT_BATCH_SIZE, 50));
    const resume_from = body.resume_from ? String(body.resume_from) : null;
    const priority = body.priority == null ? null : Number(body.priority);
    const max_batches = body.max_batches == null ? null : Math.max(1, Number(body.max_batches));
    const regression_suite = body.regression_suite === true;

    const db = base44.asServiceRole;
    const stats = { anilist_calls: 0, retries: 0, catalog_writes: 0, mapping_writes: 0, syncconflict_writes: 0 };
    const started_at = nowIso();

    const [allReleases, allMappings, allDynamic] = await Promise.all([
      loadAll(db, "WorkRelease"),
      loadAll(db, "ExternalMapping"),
      loadAll(db, "DynamicWork"),
    ]);

    const byRelease = new Map<string, any[]>();
    const byGroup = new Map<string, any[]>();
    const anilistByProviderId = new Map<string, any[]>();
    for (const m of allMappings) {
      if (m.work_release_id) {
        const list = byRelease.get(m.work_release_id) || [];
        list.push(m);
        byRelease.set(m.work_release_id, list);
      }
      if (m.work_group_id) {
        const list = byGroup.get(m.work_group_id) || [];
        list.push(m);
        byGroup.set(m.work_group_id, list);
      }
      if (m.provider === "anilist") {
        const key = String(m.provider_id);
        const list = anilistByProviderId.get(key) || [];
        list.push(m);
        anilistByProviderId.set(key, list);
      }
    }
    const dwById = new Map(allDynamic.map((d: any) => [d.id, d]));

    let target = allReleases;
    if (regression_suite) {
      const malSet = new Set(REGRESSION_MAL_IDS.map(String));
      const ids = new Set<string>();
      for (const m of allMappings) {
        if (m.provider === "mal" && malSet.has(String(m.provider_id)) && m.work_release_id) {
          ids.add(m.work_release_id);
        }
      }
      target = allReleases.filter((r: any) => ids.has(r.id));
      const pickedMal = new Set<string>();
      const unique: any[] = [];
      for (const malId of REGRESSION_MAL_IDS) {
        const mapping = allMappings.find((m: any) =>
          m.provider === "mal" && String(m.provider_id) === String(malId) && m.work_release_id,
        );
        if (!mapping) continue;
        const rel = allReleases.find((r: any) => r.id === mapping.work_release_id);
        if (rel && !pickedMal.has(String(malId))) {
          pickedMal.add(String(malId));
          unique.push(rel);
        }
      }
      target = unique;
    } else if (release_ids?.length) {
      const want = new Set(release_ids);
      target = allReleases.filter((r: any) => want.has(r.id));
    }

    target = [...target].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (priority != null && Number.isFinite(priority)) {
      // Accepted and recorded; WorkRelease has no priority column. No-op on selection.
    }

    let run: any = null;
    let processedSet = new Set<string>();
    let run_id: string;

    if (resume_from) {
      const existing = await db.entities.SyncRun.filter({ run_id: resume_from }, "-created_date", 1, 0);
      if (existing[0]) {
        run = existing[0];
        run_id = run.run_id;
        processedSet = new Set(parseJson(run.processed_release_ids, []));
      } else {
        run_id = `anilist-sync-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const resumeIdx = target.findIndex((r: any) => r.id === resume_from);
        if (resumeIdx >= 0) {
          for (let i = 0; i <= resumeIdx; i++) processedSet.add(target[i].id);
        }
      }
    } else {
      run_id = `anilist-sync-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const remaining = target.filter((r: any) => !processedSet.has(r.id));
    const existingLogs = run
      ? await db.entities.SyncLog.filter({ run_id }, "-created_date", 5000, 0)
      : [];
    const loggedIds = new Set(existingLogs.map((l: any) => l.release_id));

    if (!run) {
      run = await db.entities.SyncRun.create({
        run_id,
        dry_run,
        status: "running",
        started_at,
        completed_at: null,
        total_releases: target.length,
        processed_release_ids: JSON.stringify([...processedSet]),
        current_batch: 0,
        batches_completed: 0,
        errors: JSON.stringify([]),
        last_checkpoint_at: started_at,
        processed_count: processedSet.size,
        total_updated: 0,
        total_reviewed: 0,
        total_errors: 0,
        summary: JSON.stringify({
          sync_safe: 0,
          review_required: 0,
          id_mismatch: 0,
          not_found: 0,
          errors: 0,
          no_changes: 0,
          total_updates: 0,
          anilist_calls: 0,
          catalog_writes: 0,
          priority,
        }),
      });
    } else {
      await db.entities.SyncRun.update(run.id, {
        status: "running",
        dry_run,
        last_checkpoint_at: started_at,
      });
    }

    const counts: Record<string, number> = {
      SYNC_SAFE: 0,
      NO_CHANGES: 0,
      REVIEW_REQUIRED: 0,
      ID_MISMATCH: 0,
      ANILIST_NOT_FOUND: 0,
      ERROR: 0,
    };
    for (const log of existingLogs) {
      if (counts[log.classification] != null) counts[log.classification] += 1;
    }

    const results: any[] = [];
    const errors: any[] = parseJson(run.errors, []);
    let total_updated = Number(run.total_updated || 0);
    let total_reviewed = Number(run.total_reviewed || 0);
    let batches_completed = Number(run.batches_completed || 0);
    let current_batch = Number(run.current_batch || 0);
    let interrupted = false;
    const dwTouched = new Set<string>();
    const dwSkippedNonMain: string[] = [];

    const batches = chunk(remaining, batch_size);
    const batchesToRun = max_batches == null ? batches : batches.slice(0, max_batches);

    for (const batch of batchesToRun) {
      current_batch += 1;
      const groups = {
        anime_anilist: [] as number[],
        manga_anilist: [] as number[],
        anime_mal: [] as number[],
        manga_mal: [] as number[],
      };
      const prepared = batch.map((release: any) => {
        const maps = mappingsForRelease(release, byRelease, byGroup);
        const type = anilistTypeFor(release, maps.anilist || maps.mal);
        if (maps.anilist?.provider_id) {
          const id = Number(maps.anilist.provider_id);
          if (type === "MANGA") groups.manga_anilist.push(id);
          else groups.anime_anilist.push(id);
        } else if (maps.mal?.provider_id) {
          const id = Number(maps.mal.provider_id);
          if (type === "MANGA") groups.manga_mal.push(id);
          else groups.anime_mal.push(id);
        }
        return { release, maps, type };
      });

      const [animeByAl, mangaByAl, animeByMal, mangaByMal] = await Promise.all([
        fetchAniListGroup("ANIME", uniqueNums(groups.anime_anilist), "id", stats),
        fetchAniListGroup("MANGA", uniqueNums(groups.manga_anilist), "id", stats),
        fetchAniListGroup("ANIME", uniqueNums(groups.anime_mal), "idMal", stats),
        fetchAniListGroup("MANGA", uniqueNums(groups.manga_mal), "idMal", stats),
      ]);

      for (const item of prepared) {
        const { release, maps, type } = item;
        const row: any = {
          release_id: release.id,
          slug: release.slug,
          mal_id: maps.mal?.provider_id != null ? Number(maps.mal.provider_id) : null,
          anilist_id: maps.anilist?.provider_id != null ? Number(maps.anilist.provider_id) : null,
          match_valid: false,
          classification: null,
          updates: [],
          reviews: [],
          ignored: [],
          dw_updates: [],
          dw_skipped: release.is_main_entry !== true,
          errors: [],
          would_create_anilist_mapping: false,
          written_fields: [],
        };

        try {
          const pack = type === "MANGA"
            ? (maps.anilist ? mangaByAl : mangaByMal)
            : (maps.anilist ? animeByAl : animeByMal);
          let media: any = null;
          if (maps.anilist?.provider_id) {
            media = pack.byId.get(Number(maps.anilist.provider_id)) || null;
          } else if (maps.mal?.provider_id) {
            media = pack.byMal.get(Number(maps.mal.provider_id)) || null;
          } else {
            row.classification = "ERROR";
            row.errors.push("No ExternalMapping for anilist or mal");
          }

          if (!row.classification && !media) {
            row.classification = "ANILIST_NOT_FOUND";
            row.match_valid = false;
          }

          if (!row.classification && media) {
            row.anilist_id = Number(media.id);
            const returnedMal = media.idMal != null ? Number(media.idMal) : null;
            if (maps.mal?.provider_id != null) {
              const expectedMal = Number(maps.mal.provider_id);
              if (returnedMal !== expectedMal) {
                row.classification = "ID_MISMATCH";
                row.match_valid = false;
                row.errors.push(`idMal ${returnedMal} != ExternalMapping mal ${expectedMal}`);
              } else {
                row.match_valid = true;
                row.mal_id = expectedMal;
              }
            } else {
              row.match_valid = true;
            }
          }

          if (!row.classification && row.match_valid && media) {
            const wrNorm = {
              ...normalizeAniListToWorkRelease(media),
              format: media.format,
              status: media.status,
            };
            const applied = applyTier1Policy(release, wrNorm);
            const updates = filterAllowedUpdates(applied.updates || [], ALLOWED_WORK_RELEASE_TIER1);
            const reviews = (applied.reviews || []).filter((r: any) =>
              (ALLOWED_WORK_RELEASE_TIER1 as readonly string[]).includes(r.field),
            );
            const prohibited = findProhibitedUpdates(updates, PROHIBITED_WORK_RELEASE_FIELDS);
            if (prohibited.length) {
              row.classification = "ERROR";
              row.errors.push(`Prohibited WorkRelease fields: ${prohibited.map((p: any) => p.field).join(",")}`);
            } else {
              row.updates = updates;
              row.reviews = reviews;
              row.ignored = ignoredProtected(release, media);
              row.would_create_anilist_mapping = wouldCreateAnilistMapping(maps.mal, maps.anilist, media);

              if (release.is_main_entry === true) {
                const dw = dwById.get(release.group_id);
                if (dw) {
                  const dwNorm = normalizeAniListToDynamicWork(media);
                  const dwApplied = applyDynamicWorkDerivedPolicy(dw, dwNorm);
                  const dwUpdates = filterAllowedUpdates(dwApplied.updates || [], ALLOWED_DYNAMIC_WORK_TIER1);
                  const dwProhibited = findProhibitedUpdates(dwUpdates, PROHIBITED_DYNAMIC_WORK_FIELDS);
                  if (dwProhibited.length) {
                    row.classification = "ERROR";
                    row.errors.push(`Prohibited DynamicWork fields: ${dwProhibited.map((p: any) => p.field).join(",")}`);
                  } else {
                    row.dw_updates = dwUpdates;
                    if (dwUpdates.length) dwTouched.add(dw.id);
                  }
                }
              } else {
                dwSkippedNonMain.push(release.id);
              }
            }

            if (!row.classification) {
              row.classification = classifyResult(row);
            }
          }
        } catch (err: any) {
          row.classification = "ERROR";
          row.errors.push(String(err?.message || err));
        }

        counts[row.classification] = (counts[row.classification] || 0) + 1;
        if (row.updates?.length) total_updated += row.updates.length;
        if (row.reviews?.length) total_reviewed += row.reviews.length;

        if (!dry_run && row.classification && !["ID_MISMATCH", "ANILIST_NOT_FOUND", "ERROR"].includes(row.classification)) {
          const wrPatch: any = {};
          for (const u of row.updates) wrPatch[u.field] = u.proposed;
          if (Object.keys(wrPatch).length) {
            wrPatch.sync_status = "synced";
            wrPatch.last_synced_at = nowIso();
            await db.entities.WorkRelease.update(release.id, wrPatch);
            stats.catalog_writes += 1;
            row.written_fields = Object.keys(wrPatch);
          }
          if (release.is_main_entry === true && row.dw_updates?.length) {
            const dwPatch: any = {};
            for (const u of row.dw_updates) dwPatch[u.field] = u.proposed;
            dwPatch.last_synced_at = nowIso();
            await db.entities.DynamicWork.update(release.group_id, dwPatch);
            stats.catalog_writes += 1;
          }
          if (row.would_create_anilist_mapping && row.anilist_id) {
            const exists = (anilistByProviderId.get(String(row.anilist_id)) || []).some((m: any) =>
              m.work_release_id === release.id || m.work_group_id === release.group_id,
            );
            if (!exists) {
              const created = await db.entities.ExternalMapping.create({
                work_group_id: release.group_id,
                work_release_id: release.id,
                provider: "anilist",
                provider_id: String(row.anilist_id),
                provider_url: `https://anilist.co/anime/${row.anilist_id}`,
                provider_type: anilistTypeFor(release, maps.mal).toLowerCase() === "manga" ? "manga" : "anime",
                confidence_score: 100,
                verified_by_admin: false,
                last_synced_at: nowIso(),
              });
              stats.mapping_writes += 1;
              const list = anilistByProviderId.get(String(row.anilist_id)) || [];
              list.push(created);
              anilistByProviderId.set(String(row.anilist_id), list);
            }
          }
        }

        if (!loggedIds.has(release.id)) {
          await db.entities.SyncLog.create({
            run_id,
            release_id: release.id,
            release_slug: release.slug,
            mal_id: row.mal_id,
            anilist_id: row.anilist_id,
            match_valid: row.match_valid,
            classification: row.classification,
            proposed_fields: JSON.stringify((row.updates || []).map((u: any) => ({
              field: u.field,
              action: u.action,
              current: u.current,
              proposed: u.proposed,
            }))),
            written_fields: JSON.stringify(row.written_fields || []),
            reviews: JSON.stringify(row.reviews || []),
            ignored: JSON.stringify((row.ignored || []).map((i: any) => ({
              field: i.field,
              reason: i.reason,
              current: i.current,
            }))),
            dw_updates: JSON.stringify(row.dw_updates || []),
            error_message: row.errors?.length ? row.errors.join("; ") : null,
            timestamp: nowIso(),
          });
          loggedIds.add(release.id);
        }

        processedSet.add(release.id);
        results.push({
          release_id: row.release_id,
          slug: row.slug,
          mal_id: row.mal_id,
          anilist_id: row.anilist_id,
          match_valid: row.match_valid,
          classification: row.classification,
          proposed_update_count: row.updates?.length || 0,
          review_count: row.reviews?.length || 0,
          ignored_count: row.ignored?.length || 0,
          dw_update_count: row.dw_updates?.length || 0,
          dw_skipped: row.dw_skipped,
          written_fields: row.written_fields,
          reviews: row.reviews,
          updates: row.updates,
          errors: row.errors,
        });
      }

      batches_completed += 1;
      const checkpointAt = nowIso();
      await db.entities.SyncRun.update(run.id, {
        status: "running",
        processed_release_ids: JSON.stringify([...processedSet]),
        current_batch,
        batches_completed,
        last_checkpoint_at: checkpointAt,
        processed_count: processedSet.size,
        total_updated,
        total_reviewed,
        total_errors: counts.ERROR,
        errors: JSON.stringify(errors),
        summary: JSON.stringify({
          sync_safe: counts.SYNC_SAFE,
          review_required: counts.REVIEW_REQUIRED,
          id_mismatch: counts.ID_MISMATCH,
          not_found: counts.ANILIST_NOT_FOUND,
          errors: counts.ERROR,
          no_changes: counts.NO_CHANGES,
          total_updates: total_updated,
          anilist_calls: stats.anilist_calls,
          retries: stats.retries,
          catalog_writes: stats.catalog_writes,
          mapping_writes: stats.mapping_writes,
          syncconflict_writes: stats.syncconflict_writes,
          priority,
        }),
      });
    }

    if (max_batches != null && batches.length > max_batches && remaining.length > processedSet.size) {
      interrupted = true;
    }
    const stillRemaining = target.filter((r: any) => !processedSet.has(r.id));
    if (stillRemaining.length) interrupted = true;

    const completed_at = nowIso();
    const finalStatus = interrupted ? "interrupted" : (counts.ERROR ? "completed" : "completed");
    await db.entities.SyncRun.update(run.id, {
      status: finalStatus,
      completed_at: interrupted ? null : completed_at,
      processed_release_ids: JSON.stringify([...processedSet]),
      current_batch,
      batches_completed,
      last_checkpoint_at: completed_at,
      processed_count: processedSet.size,
      total_updated,
      total_reviewed,
      total_errors: counts.ERROR,
      errors: JSON.stringify(errors),
      summary: JSON.stringify({
        sync_safe: counts.SYNC_SAFE,
        review_required: counts.REVIEW_REQUIRED,
        id_mismatch: counts.ID_MISMATCH,
        not_found: counts.ANILIST_NOT_FOUND,
        errors: counts.ERROR,
        no_changes: counts.NO_CHANGES,
        total_updates: total_updated,
        anilist_calls: stats.anilist_calls,
        retries: stats.retries,
        catalog_writes: stats.catalog_writes,
        mapping_writes: stats.mapping_writes,
        syncconflict_writes: 0,
        dw_groups_updated: dwTouched.size,
        dw_non_main_skipped: dwSkippedNonMain.length,
        priority,
        dry_run,
      }),
    });

    const matchValid = results.filter((r) => r.match_valid).length;
    return Response.json({
      success: true,
      run_id,
      dry_run,
      status: finalStatus,
      resume_from,
      batch_size,
      current_batch,
      batches_completed,
      total_releases: target.length,
      processed_count: processedSet.size,
      remaining_count: stillRemaining.length,
      classifications: counts,
      match_valid_count: matchValid,
      total_updated,
      total_reviewed,
      total_errors: counts.ERROR,
      anilist: stats,
      catalog_writes: stats.catalog_writes,
      mapping_writes: stats.mapping_writes,
      syncconflict_writes: 0,
      dw_non_main_skipped: dwSkippedNonMain.length,
      results,
    });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

