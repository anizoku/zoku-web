/**
 * scopeConfig.ts — Central feature flag for AniZoku category scope (backend).
 *
 * ANIME_ONLY_MODE: when true, sync only processes category='anime'.
 * Manga, Movie, and Live-action releases are SKIPPED with
 * SKIPPED_FROZEN_CATEGORY classification — NO writes to catalog entities.
 *
 * To re-enable a category, add it to ACTIVE_CATEGORIES:
 *   export const ACTIVE_CATEGORIES = ['anime', 'manga'];
 *
 * IMPORTANT: This is a REVERSIBLE feature freeze. No data is deleted.
 * Frozen categories remain in the database and can be reactivated.
 *
 * CATEGORY vs FORMAT:
 * - category = 'anime' with format = 'MOVIE' (e.g. Demon Slayer: Mugen Train) → ACTIVE
 * - category = 'manga' → FROZEN (SKIPPED_FROZEN_CATEGORY)
 * - category = 'movie' (non-anime) → FROZEN
 * - category = 'liveaction' → FROZEN
 */

export const ANIME_ONLY_MODE = true;

export const ACTIVE_CATEGORIES = ['anime'];

export const FROZEN_CATEGORIES = ['manga', 'movie', 'liveaction'];

export function isCategoryActive(category: string): boolean {
  return ACTIVE_CATEGORIES.includes(category);
}

export function isCategoryFrozen(category: string): boolean {
  return FROZEN_CATEGORIES.includes(category);
}