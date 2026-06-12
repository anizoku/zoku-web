// Sistema de recomendações baseado no perfil de gosto do usuário
import { CATALOG } from "@/lib/catalog";

// Build a taste profile from user's AnimeEntry list
export function buildTasteProfile(entries) {
  const genreWeights = {};
  const formatCounts = { anime: 0, manga: 0, movie: 0, liveaction: 0 };
  const completedTitles = new Set();

  for (const entry of entries) {
    const fmt = entry.genre?.startsWith("__format:")
      ? entry.genre.replace("__format:", "")
      : entry.type || "anime";
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;

    const work = CATALOG.find((w) => w.title === entry.title);
    if (!work) continue;
    completedTitles.add(work.slug);

    const rating = entry.rating || 0;
    const weight = entry.status === "completed" || entry.status === "watching" || entry.status === "reading"
      ? Math.max(1, rating)
      : 0.5;

    for (const genre of work.genres || []) {
      genreWeights[genre] = (genreWeights[genre] || 0) + weight;
    }
  }

  // Sort genres by weight
  const topGenres = Object.entries(genreWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([g]) => g);

  return { topGenres, genreWeights, formatCounts, completedTitles };
}

// Score a catalog work against the taste profile
function scoreWork(work, profile) {
  let score = 0;
  for (const genre of work.genres || []) {
    if (profile.genreWeights[genre]) score += profile.genreWeights[genre];
  }
  // Boost by catalog rating
  score += (work.rating || 0) * 0.5;
  return score;
}

// Get recommended works for a user
export function getRecommendations(entries, filterCategory = null, limit = 30) {
  const profile = buildTasteProfile(entries);
  const userTitles = new Set(entries.map((e) => e.title));

  let candidates = CATALOG.filter((work) => {
    // Not already in user's list
    if (userTitles.has(work.title)) return false;
    // Category filter
    if (filterCategory && !work.categories.includes(filterCategory)) return false;
    // Minimum rating
    if ((work.rating || 0) < 7.0) return false;
    return true;
  });

  if (profile.topGenres.length === 0) {
    // New user: return top-rated works
    return CATALOG.filter((w) => {
      if (filterCategory && !w.categories.includes(filterCategory)) return false;
      return (w.rating || 0) >= 8.0;
    })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  // Score and sort
  return candidates
    .map((work) => ({ work, score: scoreWork(work, profile) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ work }) => work);
}

// Get related works for a specific catalog item (same genres, not in user list)
export function getRelatedWorks(item, entries, limit = 6) {
  const userTitles = new Set(entries.map((e) => e.title));
  const itemGenres = new Set(item.genres || []);

  return CATALOG.filter((work) => {
    if (work.slug === item.slug) return false;
    if (userTitles.has(work.title)) return false;
    if ((work.rating || 0) < 7.0) return false;
    const shared = (work.genres || []).filter((g) => itemGenres.has(g));
    return shared.length > 0;
  })
    .map((work) => {
      const shared = (work.genres || []).filter((g) => itemGenres.has(g)).length;
      return { work, shared };
    })
    .sort((a, b) => b.shared - a.shared || b.work.rating - a.work.rating)
    .slice(0, limit)
    .map(({ work }) => work);
}