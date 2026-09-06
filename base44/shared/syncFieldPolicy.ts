/**
 * syncFieldPolicy.ts ??? Backend port of src/lib/syncFieldPolicy.js
 *
 * SINGLE SOURCE OF TRUTH (backend copy). Keep semantically equivalent to the
 * frontend module. All AniList catalog sync MUST import from this file.
 *
 * season_year mismatch review (diff_on_stable_field) matches the validated
 * Phase 3C-3 dry-run behavior and is applied inside applyTier1Policy.
 */

export const SOURCES = {
  MAL_JIKAN: "mal_jikan",
  ANILIST: "anilist",
  TMDB: "tmdb",
  ADMIN: "admin",
  SYSTEM: "system",
  LEGACY: "legacy",
  DENORMALIZED: "denormalized",
} as const;

export const UPDATE_MODES = {
  FILL_NULL: "fill_null",
  ALWAYS: "always",
  THRESHOLD: "threshold",
  NEVER: "never",
  NEVER_FROM_ANILIST: "never_from_anilist",
} as const;

export const FIELD_CLASSIFICATION = {
  WorkRelease: {
    canonical: [
      "title_romaji", "title_english", "title_native",
      "format", "season", "season_year",
      "episode_count", "chapter_count", "duration_minutes",
      "status", "is_special", "is_movie",
      "cover_url", "banner_url",
      "score", "popularity", "trending_score",
    ],
    identity: ["id", "slug", "group_id", "group_slug"],
    editorial: ["title", "synopsis", "category", "is_main_entry", "release_order", "display_order", "is_live_action", "trending_rank"],
    system: ["sync_status", "last_synced_at"],
  },
  DynamicWork: {
    canonical: ["romaji_title", "genres", "year", "is_currently_airing"],
    identity: ["id", "slug", "title", "title_pt", "categories", "mal_id", "manga_mal_id", "franchise_id", "franchise_title"],
    legacy: ["duration", "season", "image_url", "seasons"],
    denormalized: ["franchise_poster_url", "franchise_score", "score", "episodes", "anime_status", "popularity_rank"],
    editorial: ["is_trending", "trending_rank", "related_franchise_id"],
    system: ["release_count", "sync_release_completed", "sync_status", "last_synced_at"],
  },
};

export const WORK_RELEASE_POLICY: Record<string, any> = {
  title_romaji:     { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  title_english:    { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  title_native:     { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  format:           { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  season:           { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  season_year:      { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  duration_minutes: { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL, reviewThreshold: 3 },
  banner_url:       { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  popularity:       { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL, threshold: 0.10 },

  status:           { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: "mapStatus" },
  is_special:       { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: "deriveIsSpecial" },
  is_movie:         { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: "deriveIsMovie" },

  trending_score:   { source: SOURCES.ANILIST, mode: UPDATE_MODES.THRESHOLD, threshold: 5 },
  episode_count:    { source: SOURCES.ANILIST, mode: UPDATE_MODES.THRESHOLD, threshold: 1, reviewThreshold: 2 },
  chapter_count:    { source: SOURCES.ANILIST, mode: UPDATE_MODES.THRESHOLD, threshold: 1 },

  score:            { source: SOURCES.MAL_JIKAN, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "MAL/Jikan is canonical. AniList score is informational only." },
  cover_url:        { source: SOURCES.MAL_JIKAN, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "MAL/Jikan poster is canonical. AniList coverImage does NOT overwrite." },

  title:            { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  synopsis:         { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  category:         { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  slug:             { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  is_main_entry:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  release_order:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  display_order:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  is_live_action:   { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  trending_rank:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },

  id:               { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  group_id:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  group_slug:       { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },

  sync_status:      { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  last_synced_at:   { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
};

export const DYNAMIC_WORK_POLICY: Record<string, any> = {
  romaji_title:         { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  genres:               { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  year:                 { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },

  is_currently_airing:  { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: "deriveIsCurrentlyAiring" },

  duration:             { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: 'Legacy string "24 min per ep". Use WorkRelease.duration_minutes (number).' },
  season:               { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: 'Legacy combined "spring_2016". Use WorkRelease.season + season_year.' },
  image_url:            { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: "Legacy. Use WorkRelease.cover_url." },
  seasons:              { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: "Legacy JSON array. Migrated to WorkRelease." },

  score:                { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "Denormalized from WorkRelease main entry. MAL/Jikan is primary." },
  episodes:             { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "Denormalized from WorkRelease main entry." },
  anime_status:         { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "Denormalized from WorkRelease main entry." },
  franchise_poster_url: { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "Denormalized from WorkRelease.cover_url. MAL is primary." },
  franchise_score:      { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER, note: "Admin override of franchise score." },
  popularity_rank:      { source: SOURCES.MAL_JIKAN, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: "MAL rank (position). NOT AniList popularity (absolute). Never copy." },

  id:                   { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  slug:                 { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  title:                { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  title_pt:             { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  categories:           { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  mal_id:               { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  manga_mal_id:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  franchise_id:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  franchise_title:      { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },

  synopsis:             { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  is_trending:          { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  trending_rank:        { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  related_franchise_id: { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },

  release_count:          { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  sync_release_completed: { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  sync_status:            { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  last_synced_at:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
};

const STATUS_MAP: Record<string, string> = {
  FINISHED: "finished",
  RELEASING: "releasing",
  NOT_YET_RELEASED: "not_yet_released",
  CANCELLED: "cancelled",
  HIATUS: "hiatus",
};

export function mapStatus(anilistStatus: any) {
  if (!anilistStatus) return null;
  return STATUS_MAP[anilistStatus] || String(anilistStatus).toLowerCase();
}

export function deriveIsSpecial(format: any) {
  return format === "SPECIAL" || format === "OVA";
}

export function deriveIsMovie(format: any) {
  return format === "MOVIE";
}

export function deriveIsCurrentlyAiring(anilistStatus: any) {
  return anilistStatus === "RELEASING";
}

const TRANSFORMS: Record<string, (v: any) => any> = {
  mapStatus,
  deriveIsSpecial,
  deriveIsMovie,
  deriveIsCurrentlyAiring,
};

export const ALLOWED_WORK_RELEASE_TIER1 = [
  "title_romaji",
  "title_english",
  "title_native",
  "season",
  "season_year",
  "duration_minutes",
  "banner_url",
  "popularity",
  "trending_score",
  "status",
  "episode_count",
  "chapter_count",
  "is_special",
  "is_movie",
] as const;

export const ALLOWED_DYNAMIC_WORK_TIER1 = [
  "romaji_title",
  "genres",
  "year",
  "is_currently_airing",
] as const;

export const PROHIBITED_WORK_RELEASE_FIELDS = [
  "score",
  "cover_url",
  "title",
  "synopsis",
  "category",
  "slug",
  "release_order",
  "display_order",
  "is_main_entry",
  "is_live_action",
] as const;

export const PROHIBITED_DYNAMIC_WORK_FIELDS = [
  "score",
  "cover_url",
  "title",
  "synopsis",
  "category",
  "slug",
  "release_order",
  "display_order",
  "is_main_entry",
  "is_live_action",
  "image_url",
  "franchise_poster_url",
  "popularity_rank",
  "duration",
  "season",
  "seasons",
  "franchise_score",
] as const;

export function normalizeAniListToWorkRelease(media: any) {
  if (!media) return null;
  const title = media.title || {};
  return {
    title_romaji: media.title_romaji || title.romaji || null,
    title_english: media.title_english || title.english || null,
    title_native: media.title_native || title.native || null,
    format: media.format || null,
    season: (media.season || "").toLowerCase() || null,
    season_year: media.season_year || media.seasonYear || null,
    episode_count: media.episodes ?? media.episode_count ?? null,
    chapter_count: media.chapters ?? media.chapter_count ?? null,
    duration_minutes: media.duration_minutes || media.duration || null,
    status: mapStatus(media.status),
    is_special: deriveIsSpecial(media.format),
    is_movie: deriveIsMovie(media.format),
    banner_url: media.banner_url || media.bannerImage || null,
    popularity: media.popularity ?? null,
    trending_score: media.trending_score ?? media.trending ?? 0,
  };
}

export function normalizeAniListToDynamicWork(media: any) {
  if (!media) return null;
  const title = media.title || {};
  return {
    romaji_title: media.title_romaji || title.romaji || null,
    genres: Array.isArray(media.genres) ? JSON.stringify(media.genres) : null,
    year: media.season_year || media.seasonYear || null,
    is_currently_airing: deriveIsCurrentlyAiring(media.status),
    status: media.status,
  };
}

function isFillableNull(value: any, field: string) {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (field === "trending_score" && value === 0) return true;
  return false;
}

export function applyTier1Policy(currentRelease: any, normalizedAniList: any) {
  const updates: any[] = [];
  const reviews: any[] = [];
  const ignored: any[] = [];

  if (!normalizedAniList) {
    return { updates, reviews, ignored, error: "No AniList data" };
  }

  for (const [field, policy] of Object.entries(WORK_RELEASE_POLICY)) {
    if (policy.mode === UPDATE_MODES.NEVER || policy.mode === UPDATE_MODES.NEVER_FROM_ANILIST) {
      continue;
    }

    const proposed = policy.transform
      ? TRANSFORMS[policy.transform](
          field === "status" ? normalizedAniList.status :
          field === "is_special" || field === "is_movie" ? normalizedAniList.format :
          normalizedAniList[field],
        )
      : normalizedAniList[field];
    const current = currentRelease[field];

    switch (policy.mode) {
      case UPDATE_MODES.FILL_NULL:
        if (isFillableNull(current, field) && proposed != null) {
          updates.push({ field, action: "fill_null", current, proposed });
        } else if (
          field === "season_year" &&
          !isFillableNull(current, field) &&
          proposed != null &&
          Number(current) !== Number(proposed)
        ) {
          reviews.push({
            field,
            action: "review",
            current,
            proposed,
            diff: Math.abs(Number(proposed) - Number(current)),
            reason: "diff_on_stable_field",
          });
        }
        break;

      case UPDATE_MODES.ALWAYS:
        if (proposed != null && current !== proposed) {
          updates.push({ field, action: "always", current, proposed });
        }
        break;

      case UPDATE_MODES.THRESHOLD:
        if (proposed == null) break;
        if (isFillableNull(current, field)) {
          updates.push({ field, action: "fill_null", current, proposed });
        } else {
          const diff = Math.abs(proposed - current);
          if (diff >= (policy.threshold || 0)) {
            if (policy.reviewThreshold && diff >= policy.reviewThreshold) {
              reviews.push({ field, action: "review", current, proposed, diff, reason: "exceeds_review_threshold" });
            } else {
              updates.push({ field, action: "threshold", current, proposed, diff });
            }
          }
        }
        break;
    }
  }

  return { updates, reviews, ignored };
}

export function applyDynamicWorkDerivedPolicy(currentDynamicWork: any, normalizedAniList: any) {
  const updates: any[] = [];
  const ignored: any[] = [];

  if (!normalizedAniList) {
    return { updates, ignored, error: "No AniList data" };
  }

  for (const [field, policy] of Object.entries(DYNAMIC_WORK_POLICY)) {
    if (policy.mode === UPDATE_MODES.NEVER || policy.mode === UPDATE_MODES.NEVER_FROM_ANILIST) {
      continue;
    }

    const proposed = policy.transform
      ? TRANSFORMS[policy.transform](normalizedAniList.status)
      : normalizedAniList[field];
    const current = currentDynamicWork[field];

    switch (policy.mode) {
      case UPDATE_MODES.FILL_NULL:
        if (isFillableNull(current, field) && proposed != null) {
          updates.push({ field, action: "fill_null", current, proposed });
        }
        break;

      case UPDATE_MODES.ALWAYS:
        if (proposed != null && current !== proposed) {
          updates.push({ field, action: "always", current, proposed });
        }
        break;
    }
  }

  return { updates, ignored };
}

export function isAnilistUpdatable(entityType: string, field: string) {
  const policy = entityType === "WorkRelease" ? WORK_RELEASE_POLICY : DYNAMIC_WORK_POLICY;
  const fieldPolicy = policy[field];
  if (!fieldPolicy) return false;
  return fieldPolicy.source === SOURCES.ANILIST &&
         (fieldPolicy.mode === UPDATE_MODES.FILL_NULL ||
          fieldPolicy.mode === UPDATE_MODES.ALWAYS ||
          fieldPolicy.mode === UPDATE_MODES.THRESHOLD);
}

export function isLegacyOrDenormalized(entityType: string, field: string) {
  const policy = entityType === "WorkRelease" ? WORK_RELEASE_POLICY : DYNAMIC_WORK_POLICY;
  const fieldPolicy = policy[field];
  if (!fieldPolicy) return false;
  return fieldPolicy.mode === UPDATE_MODES.NEVER || fieldPolicy.mode === UPDATE_MODES.NEVER_FROM_ANILIST;
}

export function filterAllowedUpdates(updates: any[], allowed: readonly string[]) {
  const allow = new Set(allowed);
  return (updates || []).filter((u) => allow.has(u.field));
}

export function findProhibitedUpdates(updates: any[], prohibited: readonly string[]) {
  const block = new Set(prohibited);
  return (updates || []).filter((u) => block.has(u.field));
}

