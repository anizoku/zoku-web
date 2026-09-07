/**
 * scopeConfig.js — Central category scope for AniZoku (frontend).
 *
 * ACTIVE_CATEGORIES is the SINGLE SOURCE OF TRUTH.
 * FROZEN_CATEGORIES and ANIME_ONLY_MODE are DERIVED from ACTIVE_CATEGORIES.
 *
 * To re-enable a category, add it to ACTIVE_CATEGORIES:
 *   export const ACTIVE_CATEGORIES = ['anime', 'manga'];
 * FROZEN_CATEGORIES updates automatically — no other edits needed.
 *
 * Guards use isCategoryActive(category) / isCategoryFrozen(category).
 * ANIME_ONLY_MODE is informational only — NEVER used for guards.
 *
 * CATEGORY vs FORMAT:
 * - category = 'anime' with format = 'MOVIE' (e.g. Demon Slayer: Mugen Train) → ACTIVE
 * - category = 'manga' → FROZEN when not in ACTIVE_CATEGORIES
 * - category = 'movie' (non-anime) → FROZEN when not in ACTIVE_CATEGORIES
 * - category = 'liveaction' → FROZEN when not in ACTIVE_CATEGORIES
 */

export const ALL_CATEGORIES = ['anime', 'manga', 'movie', 'liveaction'];

// ── Source of truth ──
export const ACTIVE_CATEGORIES = ['anime'];

// ── Derived (never edit directly) ──
export const FROZEN_CATEGORIES = ALL_CATEGORIES.filter(cat => !ACTIVE_CATEGORIES.includes(cat));

// Informational only — NEVER use for guards. Use isCategoryActive/isCategoryFrozen.
export const ANIME_ONLY_MODE = ACTIVE_CATEGORIES.length === 1 && ACTIVE_CATEGORIES.includes('anime');

// 'all' is a UI filter, NOT a content category — always active, never frozen.
// Unknown/empty values are never frozen (safe default).
export function isCategoryActive(category) {
  if (category === 'all') return true;
  if (!category) return false;
  return ACTIVE_CATEGORIES.includes(category);
}

export function isCategoryFrozen(category) {
  if (category === 'all') return false;
  if (!category) return false;
  if (!ALL_CATEGORIES.includes(category)) return false;
  return !ACTIVE_CATEGORIES.includes(category);
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
 * Always filters based on ACTIVE_CATEGORIES (no mode flag needed).
 */
export function filterActiveWorks(works) {
  if (!Array.isArray(works)) return [];
  return works.filter((w) => hasActiveCategory(w.categories));
}

// ── Category labels (base catalog for tab derivation) ──
export const CATEGORY_DEFINITIONS = {
  anime: 'Animes',
  manga: 'Mangás',
  movie: 'Filmes',
  liveaction: 'Live-Action',
};

// ── Derived tabs ──
export const ACTIVE_CATEGORY_TABS = [
  { key: 'all', label: 'Todos' },
  ...ACTIVE_CATEGORIES.map(cat => ({ key: cat, label: CATEGORY_DEFINITIONS[cat] })),
];

export const FROZEN_CATEGORY_TABS = FROZEN_CATEGORIES.map(cat => ({
  key: cat,
  label: CATEGORY_DEFINITIONS[cat],
  frozen: true,
}));

export const ALL_CATEGORY_TABS = [
  { key: 'all', label: 'Todos' },
  ...ALL_CATEGORIES.map(cat => ({
    key: cat,
    label: CATEGORY_DEFINITIONS[cat],
    frozen: !ACTIVE_CATEGORIES.includes(cat),
  })),
];