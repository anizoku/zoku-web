/**
 * scopeConfig.ts — Central category scope for AniZoku (backend).
 *
 * ACTIVE_CATEGORIES is the SINGLE SOURCE OF TRUTH.
 * FROZEN_CATEGORIES and ANIME_ONLY_MODE are DERIVED from ACTIVE_CATEGORIES.
 *
 * To re-enable a category, add it to ACTIVE_CATEGORIES:
 *   export const ACTIVE_CATEGORIES = ['anime', 'manga'];
 * FROZEN_CATEGORIES updates automatically — no other edits needed.
 *
 * Guards use isCategoryActive(category) — NEVER ANIME_ONLY_MODE directly.
 * Backend sync: if (!isCategoryActive(wr.category)) → SKIPPED_FROZEN_CATEGORY
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

export function isCategoryActive(category: string): boolean {
  return ACTIVE_CATEGORIES.includes(category);
}

export function isCategoryFrozen(category: string): boolean {
  return !isCategoryActive(category);
}