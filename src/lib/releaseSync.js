/**
 * releaseSync.js — Canonical WorkRelease sync pipeline (Fase 6A).
 *
 * Architecture:
 *   External API → resolve by ExternalMapping → normalize → update WorkRelease
 *
 * Source priority: AniList (primary) → MAL/Jikan (fallback) → preserve current.
 * Merge is field-by-field, not provider-level.
 *
 * Policies:
 * - FUZZY_MATCHING = DISABLED (only canonical ExternalMapping by work_release_id)
 * - NULL_OVERWRITE = DISABLED (never overwrite valid with null/0/empty)
 * - EPISODE_COUNT_DECREASE = BLOCKED (during releasing)
 * - MANUAL_OVERRIDE_PROTECTED = ENABLED
 * - ANIME_ONLY_SYNC = ENABLED (category=anime only)
 * - JIKAN_PROVIDER_IDENTITY = MAL (Jikan is not a provider; uses provider=mal)
 *
 * SCHEDULER_STATUS = MANUAL_ONLY (no cron; triggered from Admin)
 */

import { getAnilistById } from "@/lib/anilistClient";
import { jikanById, delay } from "@/lib/jikan";
import { base44 } from "@/api/base44Client";

// ── Status normalization maps ──

const ANILIST_STATUS_MAP = {
  RELEASING: "releasing",
  FINISHED: "finished",
  NOT_YET_RELEASED: "not_yet_released",
  CANCELLED: "cancelled",
  HIATUS: "hiatus",
};

const JIKAN_STATUS_MAP = {
  "Currently Airing": "releasing",
  "Finished Airing": "finished",
  "Not yet aired": "not_yet_released",
};

// Suspicious status transitions (logged as warning, not blocked)
const SUSPICIOUS_TRANSITIONS = new Set([
  "finished→releasing",
  "finished→not_yet_released",
  "cancelled→releasing",
  "cancelled→finished",
]);

// ── Duration parser ──
// Parses Jikan duration strings: "24 min per ep" → 24, "1 hr 30 min" → 90
export function parseDuration(str) {
  if (str == null) return null;
  if (typeof str === "number") return str > 0 ? str : null;

  let minutes = 0;
  const hrMatch = String(str).match(/(\d+)\s*hr/);
  if (hrMatch) minutes += parseInt(hrMatch[1], 10) * 60;
  const minMatch = String(str).match(/(\d+)\s*min/);
  if (minMatch) minutes += parseInt(minMatch[1], 10);

  return minutes > 0 ? minutes : null;
}

// ── Value validation ──
// Returns false for null, undefined, empty string, or 0 (invalid for all synced fields)
function isValidValue(v) {
  if (v == null) return false;
  if (v === "") return false;
  if (typeof v === "number" && v === 0) return false;
  return true;
}

// ── Normalize AniList data to WorkRelease fields ──
export function normalizeAniListRelease(data) {
  if (!data) return null;
  return {
    episode_count: data.episodes ?? null,
    status: ANILIST_STATUS_MAP[data.status] || null,
    season: data.season?.toLowerCase() || null,
    season_year: data.seasonYear ?? null,
    duration_minutes: data.duration ?? null,
    title: data.title?.romaji || data.title?.english || null,
    title_romaji: data.title?.romaji || null,
    title_english: data.title?.english || null,
    title_native: data.title?.native || null,
    cover_url: data.coverImage?.extraLarge || data.coverImage?.large || null,
    synopsis: data.description || null,
    score: data.averageScore ? data.averageScore / 10 : null,
  };
}

// ── Normalize Jikan data to WorkRelease fields ──
export function normalizeJikanRelease(data) {
  if (!data) return null;
  return {
    episode_count: data.episodes ?? null,
    status: JIKAN_STATUS_MAP[data.status] || null,
    season: data.season?.toLowerCase() || null,
    season_year: data.year ?? null,
    duration_minutes: parseDuration(data.duration),
    title: data.title || null,
    title_romaji: data.title_japanese || null,
    title_english: data.title_english || null,
    title_native: data.title_japanese || null,
    cover_url: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || null,
    synopsis: data.synopsis || null,
    score: data.score ?? null,
  };
}

// ── Field-by-field merge ──
// AniList priority → Jikan fallback → preserve current.
// Never overwrites valid existing with null/0/empty.
// Blocks episode_count decrease during releasing.
export function mergeReleaseMetadata(anilistNorm, jikanNorm, currentRelease) {
  const changes = {};
  const warnings = [];
  const merged = {};

  const FIELDS = [
    "episode_count", "status", "season", "season_year", "duration_minutes",
    "title", "title_romaji", "title_english", "title_native",
    "cover_url", "synopsis", "score",
  ];

  for (const field of FIELDS) {
    let value = null;
    let source = null;

    if (anilistNorm && isValidValue(anilistNorm[field])) {
      value = anilistNorm[field];
      source = "anilist";
    } else if (jikanNorm && isValidValue(jikanNorm[field])) {
      value = jikanNorm[field];
      source = "mal";
    }

    // No provider gave a valid value → preserve current (skip)
    if (value === null) continue;

    const currentVal = currentRelease ? currentRelease[field] : undefined;

    // Episode count regression protection
    if (field === "episode_count" && currentVal != null && value < currentVal) {
      warnings.push({
        type: "EPISODE_COUNT_REGRESSION_BLOCKED",
        field,
        from: currentVal,
        to: value,
        current_status: currentRelease?.status,
      });
      continue; // don't update — preserve current
    }

    // Provider disagreement (informational, AniList wins)
    if (
      anilistNorm && jikanNorm &&
      isValidValue(anilistNorm[field]) && isValidValue(jikanNorm[field]) &&
      anilistNorm[field] !== jikanNorm[field]
    ) {
      warnings.push({
        type: "PROVIDER_DISAGREEMENT",
        field,
        anilist: anilistNorm[field],
        mal: jikanNorm[field],
        chosen: source,
      });
    }

    // Status transition warning (suspicious but not blocked)
    if (field === "status" && currentVal && currentVal !== value) {
      const transition = `${currentVal}→${value}`;
      if (SUSPICIOUS_TRANSITIONS.has(transition)) {
        warnings.push({
          type: "STATUS_REGRESSION_OR_CONFLICT",
          field,
          from: currentVal,
          to: value,
        });
      }
    }

    if (value !== currentVal) {
      changes[field] = { from: currentVal ?? null, to: value };
      merged[field] = value;
    }
  }

  return { merged, changes, warnings };
}

// ── Batch resolve ExternalMappings for a list of release IDs ──
// One query (list all), filter client-side — avoids N+1.
async function resolveMappingsForReleases(releaseIds) {
  if (!releaseIds || releaseIds.length === 0) return new Map();

  const releaseIdSet = new Set(releaseIds);
  const map = new Map();

  try {
    const allMappings = await base44.entities.ExternalMapping.list(null, 5000);
    for (const m of allMappings) {
      if (m.work_release_id && releaseIdSet.has(m.work_release_id)) {
        if (!map.has(m.work_release_id)) {
          map.set(m.work_release_id, {});
        }
        const entry = map.get(m.work_release_id);
        if (m.provider === "anilist" && !entry.anilist) entry.anilist = m;
        if (m.provider === "mal" && !entry.mal) entry.mal = m;
      }
    }
  } catch {
    // batch failed — individual releases will report NO_EXTERNAL_MAPPING
  }

  return map;
}

// ── Fetch AniList with simple retry ──
async function fetchAniListWithRetry(providerId, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await getAnilistById(providerId, "ANIME");
      return data;
    } catch (e) {
      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  return null;
}

// ── Fetch Jikan with simple retry (retries on null which includes 429) ──
async function fetchJikanWithRetry(malId, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const data = await jikanById("anime", malId);
    if (data) return data;
    if (attempt < maxRetries) {
      await delay(1000 * (attempt + 1));
    }
  }
  return null;
}

// ── Sync a single WorkRelease ──
// mappings: { anilist: ExternalMapping, mal: ExternalMapping } (pre-resolved)
export async function syncSingleWorkRelease(release, mappings, options = {}) {
  const { onLog, dryRun = false } = options;

  const result = {
    release_id: release.id,
    title: release.title,
    status: "UPDATED",
    providers_used: [],
    changes: {},
    warnings: [],
  };

  // 1. Manual override protection
  if (release.sync_status === "manual_override") {
    result.status = "SKIPPED_MANUAL_OVERRIDE";
    onLog?.(`${release.title}: SKIPPED (manual_override)`, "warn");
    return result;
  }

  // 2. Resolve mappings (pre-resolved in batch)
  const anilistMapping = mappings?.anilist || null;
  const malMapping = mappings?.mal || null;

  if (!anilistMapping && !malMapping) {
    result.status = "NO_EXTERNAL_MAPPING";
    onLog?.(`${release.title}: NO_EXTERNAL_MAPPING — pulado`, "warn");
    return result;
  }

  // 3. Fetch AniList (primary)
  let anilistNorm = null;
  if (anilistMapping) {
    try {
      const anilistData = await fetchAniListWithRetry(anilistMapping.provider_id);
      anilistNorm = normalizeAniListRelease(anilistData);
      if (anilistNorm) result.providers_used.push("anilist");
    } catch (e) {
      onLog?.(`${release.title}: AniList erro — ${e.message}`, "warn");
    }
  }

  // 4. Fetch MAL/Jikan (fallback)
  let jikanNorm = null;
  if (malMapping) {
    await delay(400); // Jikan rate limit ~3 req/s
    const jikanData = await fetchJikanWithRetry(malMapping.provider_id);
    jikanNorm = normalizeJikanRelease(jikanData);
    if (jikanNorm) result.providers_used.push("mal");
  }

  // 5. Both providers failed
  if (!anilistNorm && !jikanNorm) {
    result.status = "PROVIDER_ERROR";
    onLog?.(`${release.title}: PROVIDER_ERROR — ambos providers falharam`, "error");
    return result;
  }

  // 6. Merge field-by-field
  const { merged, changes, warnings } = mergeReleaseMetadata(anilistNorm, jikanNorm, release);
  result.changes = changes;
  result.warnings = warnings;

  // 7. Determine result status
  const hasChanges = Object.keys(merged).length > 0;
  result.status = hasChanges ? "UPDATED" : "UNCHANGED";

  // 8. Write to WorkRelease
  if (!dryRun) {
    const writePayload = {
      ...merged,
      last_synced_at: new Date().toISOString(),
    };
    if (hasChanges) {
      writePayload.sync_status = "synced";
    }
    try {
      await base44.entities.WorkRelease.update(release.id, writePayload);
    } catch (e) {
      result.status = "PROVIDER_ERROR";
      result.warnings.push({ type: "WRITE_ERROR", message: e.message });
      onLog?.(`${release.title}: WRITE_ERROR — ${e.message}`, "error");
      return result;
    }
  }

  // 9. Log result
  const providerStr = result.providers_used.join(" + ") || "nenhum";
  if (hasChanges) {
    const changeSummary = Object.entries(changes)
      .map(([f, v]) => `${f}: ${v.from ?? "?"} → ${v.to}`)
      .join(", ");
    onLog?.(`${release.title}: UPDATED [${providerStr}] — ${changeSummary}`, "success");
  } else {
    onLog?.(`${release.title}: sem alterações [${providerStr}]`, "info");
  }

  // 10. Log warnings
  for (const w of warnings) {
    if (w.type === "EPISODE_COUNT_REGRESSION_BLOCKED") {
      onLog?.(`  ⚠ REGRESSÃO BLOQUEADA: ep ${w.from} → ${w.to} (status: ${w.current_status})`, "warn");
    } else if (w.type === "PROVIDER_DISAGREEMENT") {
      onLog?.(`  ℹ DISCORDÂNCIA: ${w.field} anilist=${w.anilist} mal=${w.mal} (escolhido: ${w.chosen})`, "info");
    } else if (w.type === "STATUS_REGRESSION_OR_CONFLICT") {
      onLog?.(`  ⚠ STATUS SUSPEITO: ${w.from} → ${w.to}`, "warn");
    }
  }

  return result;
}

// ── Sync all active anime releases (releasing + not_yet_released) ──
export async function syncActiveWorkReleases(options = {}) {
  const { onLog, onProgress, dryRun = false, abortRef } = options;

  // 1. Fetch all WorkReleases
  const allReleases = await base44.entities.WorkRelease.list(null, 5000);

  // 2. Filter: anime only, releasing + not_yet_released
  const activeReleases = allReleases.filter(
    (r) =>
      r.category === "anime" &&
      (r.status === "releasing" || r.status === "not_yet_released")
  );

  onLog?.(
    `Encontrados ${activeReleases.length} releases ativos (releasing + not_yet_released, anime only)`,
    "info"
  );

  if (activeReleases.length === 0) {
    return {
      results: [],
      summary: {
        total: 0, updated: 0, unchanged: 0, skipped_override: 0,
        no_mapping: 0, errors: 0, regression_blocked: 0, provider_disagreements: 0,
      },
    };
  }

  // 3. Batch resolve ExternalMappings (one query, not N+1)
  const releaseIds = activeReleases.map((r) => r.id);
  const mappingsByReleaseId = await resolveMappingsForReleases(releaseIds);

  let withAnilist = 0;
  let withMal = 0;
  let withBoth = 0;
  let withNone = 0;
  for (const release of activeReleases) {
    const m = mappingsByReleaseId.get(release.id) || {};
    const hasA = !!m.anilist;
    const hasM = !!m.mal;
    if (hasA && hasM) withBoth++;
    else if (hasA) withAnilist++;
    else if (hasM) withMal++;
    else withNone++;
  }
  onLog?.(
    `Mappings: ${withAnilist + withBoth} AniList, ${withMal + withBoth} MAL, ${withBoth} ambos, ${withNone} sem mapping`,
    "info"
  );

  // 4. Sync each release sequentially (rate limit friendly)
  const results = [];
  for (let i = 0; i < activeReleases.length; i++) {
    if (abortRef?.current) {
      onLog?.("Sincronização interrompida pelo usuário.", "warn");
      break;
    }
    const release = activeReleases[i];
    onProgress?.(i + 1, activeReleases.length);

    const mappings = mappingsByReleaseId.get(release.id) || {};
    const result = await syncSingleWorkRelease(release, mappings, { onLog, dryRun });
    results.push(result);

    // Rate limit between releases
    if (i < activeReleases.length - 1) {
      await delay(500);
    }
  }

  // 5. Summary
  const summary = {
    total: results.length,
    updated: results.filter((r) => r.status === "UPDATED").length,
    unchanged: results.filter((r) => r.status === "UNCHANGED").length,
    skipped_override: results.filter((r) => r.status === "SKIPPED_MANUAL_OVERRIDE").length,
    no_mapping: results.filter((r) => r.status === "NO_EXTERNAL_MAPPING").length,
    errors: results.filter((r) => r.status === "PROVIDER_ERROR").length,
    regression_blocked: results.filter((r) =>
      r.warnings.some((w) => w.type === "EPISODE_COUNT_REGRESSION_BLOCKED")
    ).length,
    provider_disagreements: results.filter((r) =>
      r.warnings.some((w) => w.type === "PROVIDER_DISAGREEMENT")
    ).length,
  };

  onLog?.(
    `Resumo: ${summary.updated} atualizados, ${summary.unchanged} sem alterações, ${summary.no_mapping} sem mapping, ${summary.skipped_override} manual_override, ${summary.errors} erros, ${summary.regression_blocked} regressões bloqueadas`,
    "info"
  );

  return { results, summary };
}

// ── Get active release stats (for Admin UI) ──
export async function getActiveReleaseStats() {
  const allReleases = await base44.entities.WorkRelease.list(null, 5000);
  const animeReleases = allReleases.filter((r) => r.category === "anime");

  const releasing = animeReleases.filter((r) => r.status === "releasing");
  const notYetReleased = animeReleases.filter((r) => r.status === "not_yet_released");

  // Last sync: find most recent last_synced_at among anime releases
  const synced = animeReleases.filter((r) => r.last_synced_at);
  let lastSyncDate = null;
  for (const r of synced) {
    const d = new Date(r.last_synced_at);
    if (!lastSyncDate || d > lastSyncDate) lastSyncDate = d;
  }

  return {
    total_anime: animeReleases.length,
    releasing: releasing.length,
    not_yet_released: notYetReleased.length,
    active: releasing.length + notYetReleased.length,
    last_synced_at: lastSyncDate?.toISOString() || null,
  };
}