/**
 * syncFieldPolicy.js — Central policy for AniList ↔ AniZoku field synchronization.
 *
 * SINGLE SOURCE OF TRUTH for:
 * - Which fields are canonical vs legacy vs denormalized
 * - Which source (MAL/Jikan, AniList, TMDB, admin, system) can update each field
 * - Overwrite rules (fill_null, always, threshold, never)
 * - Transforms (status mapping, derived booleans)
 * - Thresholds and review conditions
 *
 * All sync logic (dry-run and real) MUST import from this file.
 * Never spread these rules across multiple files.
 */

// ── Sources ──
export const SOURCES = {
  MAL_JIKAN: 'mal_jikan',
  ANILIST: 'anilist',
  TMDB: 'tmdb',
  ADMIN: 'admin',
  SYSTEM: 'system',
  LEGACY: 'legacy',
  DENORMALIZED: 'denormalized',
};

// ── Update Modes ──
export const UPDATE_MODES = {
  FILL_NULL: 'fill_null',
  ALWAYS: 'always',
  THRESHOLD: 'threshold',
  NEVER: 'never',
  NEVER_FROM_ANILIST: 'never_from_anilist',
};

// ── Field Classification ──
export const FIELD_CLASSIFICATION = {
  WorkRelease: {
    canonical: [
      'title_romaji', 'title_english', 'title_native',
      'format', 'season', 'season_year',
      'episode_count', 'chapter_count', 'duration_minutes',
      'status', 'is_special', 'is_movie',
      'cover_url', 'banner_url',
      'score', 'popularity', 'trending_score',
    ],
    identity: ['id', 'slug', 'group_id', 'group_slug'],
    editorial: ['title', 'synopsis', 'category', 'is_main_entry', 'release_order', 'display_order', 'is_live_action', 'trending_rank'],
    system: ['sync_status', 'last_synced_at'],
  },
  DynamicWork: {
    canonical: ['romaji_title', 'genres', 'year', 'is_currently_airing'],
    identity: ['id', 'slug', 'title', 'title_pt', 'categories', 'mal_id', 'manga_mal_id', 'franchise_id', 'franchise_title'],
    legacy: ['duration', 'season', 'image_url', 'seasons'],
    denormalized: ['franchise_poster_url', 'franchise_score', 'score', 'episodes', 'anime_status', 'popularity_rank'],
    editorial: ['is_trending', 'trending_rank', 'related_franchise_id'],
    system: ['release_count', 'sync_release_completed', 'sync_status', 'last_synced_at'],
  },
};

// ── WorkRelease Field Policy ──
export const WORK_RELEASE_POLICY = {
  // Tier 1: fill_null from AniList
  title_romaji:     { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  title_english:    { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  title_native:     { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  format:           { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  season:           { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  season_year:      { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  duration_minutes: { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL, reviewThreshold: 3 },
  banner_url:       { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  popularity:       { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL, threshold: 0.10 },

  // Tier 1: always update (derived)
  status:           { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: 'mapStatus' },
  is_special:       { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: 'deriveIsSpecial' },
  is_movie:         { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: 'deriveIsMovie' },

  // Tier 1: threshold
  trending_score:   { source: SOURCES.ANILIST, mode: UPDATE_MODES.THRESHOLD, threshold: 5 },
  episode_count:    { source: SOURCES.ANILIST, mode: UPDATE_MODES.THRESHOLD, threshold: 1, reviewThreshold: 2 },
  chapter_count:    { source: SOURCES.ANILIST, mode: UPDATE_MODES.THRESHOLD, threshold: 1 },

  // NEVER auto-update from AniList
  score:            { source: SOURCES.MAL_JIKAN, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'MAL/Jikan is canonical. AniList score is informational only.' },
  cover_url:        { source: SOURCES.MAL_JIKAN, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'MAL/Jikan poster is canonical. AniList coverImage does NOT overwrite.' },

  // Editorial (admin only)
  title:            { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  synopsis:         { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  category:         { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  slug:             { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  is_main_entry:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  release_order:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  display_order:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  is_live_action:   { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  trending_rank:    { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },

  // Identity (never change)
  id:               { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  group_id:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  group_slug:       { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },

  // System managed
  sync_status:      { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  last_synced_at:   { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
};

// ── DynamicWork Field Policy ──
export const DYNAMIC_WORK_POLICY = {
  // Tier 1: fill_null from AniList
  romaji_title:         { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  genres:               { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },
  year:                 { source: SOURCES.ANILIST, mode: UPDATE_MODES.FILL_NULL },

  // Tier 1: always update (derived)
  is_currently_airing:  { source: SOURCES.ANILIST, mode: UPDATE_MODES.ALWAYS, transform: 'deriveIsCurrentlyAiring' },

  // Legacy (NEVER write in new sync)
  duration:             { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: 'Legacy string "24 min per ep". Use WorkRelease.duration_minutes (number).' },
  season:               { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: 'Legacy combined "spring_2016". Use WorkRelease.season + season_year.' },
  image_url:            { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: 'Legacy. Use WorkRelease.cover_url.' },
  seasons:              { source: SOURCES.LEGACY, mode: UPDATE_MODES.NEVER, note: 'Legacy JSON array. Migrated to WorkRelease.' },

  // Denormalized (NEVER write from AniList)
  score:                { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'Denormalized from WorkRelease main entry. MAL/Jikan is primary.' },
  episodes:             { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'Denormalized from WorkRelease main entry.' },
  anime_status:         { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'Denormalized from WorkRelease main entry.' },
  franchise_poster_url: { source: SOURCES.DENORMALIZED, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'Denormalized from WorkRelease.cover_url. MAL is primary.' },
  franchise_score:      { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER, note: 'Admin override of franchise score.' },
  popularity_rank:      { source: SOURCES.MAL_JIKAN, mode: UPDATE_MODES.NEVER_FROM_ANILIST, note: 'MAL rank (position). NOT AniList popularity (absolute). Never copy.' },

  // Identity (never change)
  id:                   { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  slug:                 { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  title:                { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  title_pt:             { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  categories:           { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  mal_id:               { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  manga_mal_id:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  franchise_id:         { source: SOURCES.SYSTEM, mode: UPDATE_MODES.NEVER },
  franchise_title:      { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },

  // Editorial (admin only)
  synopsis:             { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  is_trending:          { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  trending_rank:        { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },
  related_franchise_id: { source: SOURCES.ADMIN, mode: UPDATE_MODES.NEVER },

  // System managed
  release_count:          { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  sync_release_completed: { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  sync_status:            { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
  last_synced_at:          { source: SOURCES.SYSTEM, mode: UPDATE_MODES.ALWAYS },
};

// ── Transforms ──
const STATUS_MAP = {
  FINISHED: 'finished',
  RELEASING: 'releasing',
  NOT_YET_RELEASED: 'not_yet_released',
  CANCELLED: 'cancelled',
  HIATUS: 'hiatus',
};

export function mapStatus(anilistStatus) {
  if (!anilistStatus) return null;
  return STATUS_MAP[anilistStatus] || String(anilistStatus).toLowerCase();
}

export function deriveIsSpecial(format) {
  return format === 'SPECIAL' || format === 'OVA';
}

export function deriveIsMovie(format) {
  return format === 'MOVIE';
}

export function deriveIsCurrentlyAiring(anilistStatus) {
  return anilistStatus === 'RELEASING';
}

const TRANSFORMS = { mapStatus, deriveIsSpecial, deriveIsMovie, deriveIsCurrentlyAiring };

// ── Normalizers (pure, no writes) ──

/**
 * Normalizes AniList media data into a WorkRelease field map.
 * Accepts normalized data from anilistClient.js OR raw AniList GraphQL response.
 * score and cover_url are intentionally excluded — NEVER_FROM_ANILIST.
 */
export function normalizeAniListToWorkRelease(media) {
  if (!media) return null;
  const title = media.title || {};
  return {
    title_romaji: media.title_romaji || title.romaji || null,
    title_english: media.title_english || title.english || null,
    title_native: media.title_native || title.native || null,
    format: media.format || null,
    season: (media.season || '').toLowerCase() || null,
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

/**
 * Normalizes AniList media data into a DynamicWork field map.
 * Only includes canonical fields that AniList can update.
 * Legacy and denormalized fields are intentionally excluded.
 */
export function normalizeAniListToDynamicWork(media) {
  if (!media) return null;
  const title = media.title || {};
  return {
    romaji_title: media.title_romaji || title.romaji || null,
    genres: Array.isArray(media.genres) ? JSON.stringify(media.genres) : null,
    year: media.season_year || media.seasonYear || null,
    is_currently_airing: deriveIsCurrentlyAiring(media.status),
  };
}

// ── Policy Appliers (pure, no writes) ──

function isFillableNull(value, field) {
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (field === 'trending_score' && value === 0) return true;
  return false;
}

/**
 * Applies Tier 1 policy to a WorkRelease.
 * Returns { updates, reviews, ignored } — all simulated, no writes.
 */
export function applyTier1Policy(currentRelease, normalizedAniList) {
  const updates = [];
  const reviews = [];
  const ignored = [];

  if (!normalizedAniList) {
    return { updates, reviews, ignored, error: 'No AniList data' };
  }

  for (const [field, policy] of Object.entries(WORK_RELEASE_POLICY)) {
    if (policy.mode === UPDATE_MODES.NEVER || policy.mode === UPDATE_MODES.NEVER_FROM_ANILIST) {
      continue;
    }

    const proposed = policy.transform
      ? TRANSFORMS[policy.transform](
          field === 'status' ? normalizedAniList.status :
          field === 'is_special' || field === 'is_movie' ? normalizedAniList.format :
          normalizedAniList[field]
        )
      : normalizedAniList[field];
    const current = currentRelease[field];

    switch (policy.mode) {
      case UPDATE_MODES.FILL_NULL:
        if (isFillableNull(current, field) && proposed != null) {
          updates.push({ field, action: 'fill_null', current, proposed });
        }
        break;

      case UPDATE_MODES.ALWAYS:
        if (proposed != null && current !== proposed) {
          updates.push({ field, action: 'always', current, proposed });
        }
        break;

      case UPDATE_MODES.THRESHOLD:
        if (proposed == null) break;
        if (isFillableNull(current, field)) {
          updates.push({ field, action: 'fill_null', current, proposed });
        } else {
          const diff = Math.abs(proposed - current);
          if (diff >= (policy.threshold || 0)) {
            if (policy.reviewThreshold && diff >= policy.reviewThreshold) {
              reviews.push({ field, action: 'review', current, proposed, diff, reason: 'exceeds_review_threshold' });
            } else {
              updates.push({ field, action: 'threshold', current, proposed, diff });
            }
          }
        }
        break;
    }
  }

  return { updates, reviews, ignored };
}

/**
 * Applies DynamicWork derived policy.
 * Only updates canonical fields (romaji_title, genres, year, is_currently_airing).
 * Legacy and denormalized fields are always ignored.
 */
export function applyDynamicWorkDerivedPolicy(currentDynamicWork, normalizedAniList) {
  const updates = [];
  const ignored = [];

  if (!normalizedAniList) {
    return { updates, ignored, error: 'No AniList data' };
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
          updates.push({ field, action: 'fill_null', current, proposed });
        }
        break;

      case UPDATE_MODES.ALWAYS:
        if (proposed != null && current !== proposed) {
          updates.push({ field, action: 'always', current, proposed });
        }
        break;
    }
  }

  return { updates, ignored };
}

// ── Validation Helpers ──

export function isAnilistUpdatable(entityType, field) {
  const policy = entityType === 'WorkRelease' ? WORK_RELEASE_POLICY : DYNAMIC_WORK_POLICY;
  const fieldPolicy = policy[field];
  if (!fieldPolicy) return false;
  return fieldPolicy.source === SOURCES.ANILIST &&
         (fieldPolicy.mode === UPDATE_MODES.FILL_NULL ||
          fieldPolicy.mode === UPDATE_MODES.ALWAYS ||
          fieldPolicy.mode === UPDATE_MODES.THRESHOLD);
}

export function isLegacyOrDenormalized(entityType, field) {
  const policy = entityType === 'WorkRelease' ? WORK_RELEASE_POLICY : DYNAMIC_WORK_POLICY;
  const fieldPolicy = policy[field];
  if (!fieldPolicy) return false;
  return fieldPolicy.mode === UPDATE_MODES.NEVER || fieldPolicy.mode === UPDATE_MODES.NEVER_FROM_ANILIST;
}