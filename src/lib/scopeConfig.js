/**
 * scopeConfig.js — Central feature flag for AniZoku category scope (frontend).
 *
 * ANIME_ONLY_MODE: when true, only 'anime' category is active in the product.
 * Manga, Movie, and Live-action are FROZEN (hidden from UI, no sync writes).
 *
 * To re-enable a category, add it to ACTIVE_CATEGORIES:
 *   export const ACTIVE_CATEGORIES = ['anime', 'manga'];
 *
 * IMPORTANT: This is a REVERSIBLE feature freeze. No data is deleted.
 * Frozen categories remain in the database and can be reactivated by
 * updating ACTIVE_CATEGORIES.
 *
 * CATEGORY vs FORMAT:
 * - category = 'anime' with format = 'MOVIE' (e.g. Demon Slayer: Mugen Train) → ACTIVE
 * - category = 'manga' → FROZEN
 * - category = 'movie' (non-anime) → FROZEN
 * - category = 'liveaction' → FROZEN
 */

export const ANIME_ONLY_MODE = true;

export const ALL_CATEGORIES = ['anime', 'manga', 'movie', 'liveaction'];

export const ACTIVE_CATEGORIES = ['anime'];

export const FROZEN_CATEGORIES = ['manga', 'movie', 'liveaction'];

export function isCategoryActive(category) {
  return ACTIVE_CATEGORIES.includes(category);
}

export function isCategoryFrozen(category) {
  return FROZEN_CATEGORIES.includes(category);
}

/**
 * Returns true if the work has at least one active category.
 * A work with categories: ['anime', 'manga'] is still active (has anime).
 */
export function hasActiveCategory(categories) {
  if (!categories || !Array.isArray(categories)) return false;
  return categories.some((cat) => ACTIVE_CATEGORIES.includes(cat));
}

/**
 * Filters an array of work objects to only those with at least one active category.
 * No-op when ANIME_ONLY_MODE is false.
 */
export function filterActiveWorks(works) {
  if (!ANIME_ONLY_MODE) return works;
  if (!Array.isArray(works)) return [];
  return works.filter((w) => hasActiveCategory(w.categories));
}

// For UI category tabs — only active categories + "all"
export const ACTIVE_CATEGORY_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'anime', label: 'Animes' },
];

// Frozen category tabs (for admin display with FROZEN badge)
export const FROZEN_CATEGORY_TABS = [
  { key: 'manga', label: 'Mangás', frozen: true },
  { key: 'movie', label: 'Filmes', frozen: true },
  { key: 'liveaction', label: 'Live-Action', frozen: true },
];

// Full category list for admin (active + frozen, with frozen flag)
export const ALL_CATEGORY_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'anime', label: 'Animes' },
  { key: 'manga', label: 'Mangás', frozen: true },
  { key: 'movie', label: 'Filmes', frozen: true },
  { key: 'liveaction', label: 'Live-Action', frozen: true },
];