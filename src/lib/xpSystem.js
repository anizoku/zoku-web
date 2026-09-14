// ============================================================
// XP SYSTEM ENGINE
// ============================================================

import { ACHIEVEMENTS, getAchievementColor } from "./achievements";
import { CATALOG } from "./catalog";
export { ACHIEVEMENTS, getAchievementColor };

// XP earned per action
export const XP_REWARDS = {
  episode_watched: 10,
  chapter_read: 7,
  anime_completed: 150,
  manga_completed: 100,
  post_created: 20,
  anime_added: 15,
};

const BASE_XP = 100;
const EXPONENT = 1.6;

export function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * Math.pow(level - 1, EXPONENT));
}

export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 2; i <= level; i++) total += xpRequiredForLevel(i);
  return total;
}

export function getLevelFromXp(xp) {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = xpRequiredForLevel(level + 1);
    if (accumulated + needed > xp) break;
    accumulated += needed;
    level++;
    if (level >= 100) break;
  }
  return level;
}

export function getXpProgress(xp) {
  const level = getLevelFromXp(xp);
  let accumulated = 0;
  for (let i = 2; i <= level; i++) accumulated += xpRequiredForLevel(i);
  const currentLevelXp = xp - accumulated;
  const nextLevelXp = xpRequiredForLevel(level + 1);
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    percent: nextLevelXp > 0 ? Math.min(100, Math.floor((currentLevelXp / nextLevelXp) * 100)) : 100,
    totalXp: xp,
  };
}

// ── RANKS ────────────────────────────────────────────────────
export const RANKS = [
  { minLevel: 1,  title: "Novato",           color: "text-muted-foreground", bg: "bg-muted/30",       border: "border-border"          },
  { minLevel: 5,  title: "Iniciante Otaku",  color: "text-chart-2",          bg: "bg-chart-2/10",     border: "border-chart-2/30"      },
  { minLevel: 10, title: "Assistidor Ávido", color: "text-primary",          bg: "bg-primary/10",     border: "border-primary/30"      },
  { minLevel: 20, title: "Mestre do Shonen", color: "text-chart-4",          bg: "bg-chart-4/10",     border: "border-chart-4/30"      },
  { minLevel: 35, title: "Lenda da Cultura", color: "text-chart-5",          bg: "bg-chart-5/10",     border: "border-chart-5/30"      },
  { minLevel: 50, title: "Deus Otaku",       color: "text-yellow-400",       bg: "bg-yellow-400/10",  border: "border-yellow-400/40"   },
  { minLevel: 75, title: "Transcendente",    color: "text-purple-400",       bg: "bg-purple-400/10",  border: "border-purple-400/40"   },
];

export function getRankForLevel(level) {
  return [...RANKS].reverse().find((r) => level >= r.minLevel) || RANKS[0];
}

// ── STATS ────────────────────────────────────────────────────
export function computeStats(entries, posts, friendships = [], events = [], profile = null, extra = {}) {
  const myAnime    = entries.filter((e) => e.type === "anime");
  const myManga    = entries.filter((e) => e.type === "manga");
  const myMovies   = entries.filter((e) => e.type === "movie" || e.type === "liveaction");
  const myLiveact  = entries.filter((e) => e.type === "liveaction");

  const totalEpisodes  = myAnime.reduce((s, e) => s + (e.current_episode || 0), 0);
  const totalChapters  = myManga.reduce((s, e) => s + (e.current_chapter || 0), 0);
  const totalMovies    = myMovies.filter((e) => e.status === "completed").length;
  const completedTitles = entries.filter((e) => e.status === "completed").length;
  const completedAnime = myAnime.filter(e => e.status === "completed").length;
  const completedManga = myManga.filter(e => e.status === "completed").length;
  const totalTitles    = entries.length;
  const plannedTitles  = entries.filter((e) => e.status === "planned").length;
  const hasAnime       = myAnime.length > 0;
  const hasManga       = myManga.length > 0;
  const hasMovie       = myMovies.length > 0;
  const hasLiveaction  = myLiveact.length > 0;

  // Category count (for four_categories achievement)
  const categoryCount  = [hasAnime, hasManga, hasMovie, hasLiveaction].filter(Boolean).length;

  // Genre diversity — use real genres from catalog, not the __format: marker stored in entry.genre
  const normalize = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const allGenres = new Set(
    entries.flatMap(e => {
      const work = CATALOG.find(w => normalize(w.title) === normalize(e.title));
      return work?.genres || [];
    })
  );
  const uniqueGenres = allGenres.size;

  // Same work in both types (title appears in both anime and manga entries)
  const animeTitles = new Set(myAnime.map(e => e.title?.toLowerCase().trim()));
  const mangaTitles = new Set(myManga.map(e => e.title?.toLowerCase().trim()));
  const sameWorkBothTypes = [...animeTitles].filter(t => mangaTitles.has(t)).length;

  // Long completed works
  const completedLongAnime = myAnime.filter(e => e.status === "completed" && (e.total_episodes || 0) >= 100).length;
  const completedLongManga = myManga.filter(e => e.status === "completed" && (e.total_chapters || 0) >= 100).length;

  const totalPosts    = posts.length;
  const theoryPosts   = posts.filter((p) => p.post_type === "theory").length;
  const reviewPosts   = posts.filter((p) => p.post_type === "review").length;
  const likesGiven    = extra.likesGiven || 0;
  const likesReceived = posts.reduce((s, p) => s + (p.likes_count || 0), 0);
  const maxLikesOnPost = posts.reduce((m, p) => Math.max(m, p.likes_count || 0), 0);
  const commentsReceived = posts.reduce((s, p) => s + (p.comments_count || 0), 0);

  const friendsCount  = friendships.filter((f) => f.status === "accepted").length;
  const friendRequestsSent = friendships.filter((f) => f.requester_email === (profile?.user_email || "")).length;

  // Communities — from extra data passed in
  const communitiesJoined  = extra.communitiesJoined  || 0;
  const communitiesCreated = extra.communitiesCreated || 0;
  const communityMaxMembers = extra.communityMaxMembers || 0;
  const communityPosts     = posts.filter(p => p.community_id).length;

  // Events
  const eventsJoined  = events.length;
  const eventsCreated = events.filter(e => e.organizer_email === (profile?.user_email || "")).length;
  const animeEventsJoined = events.filter((e) => e.media_type === "anime").length;
  const mangaEventsJoined = events.filter((e) => e.media_type === "manga").length;

  // Watch Together
  const watchTogetherCount     = extra.watchTogetherCount || 0;
  const watchTogetherCompleted = extra.watchTogetherCompleted || 0;

  // Streak & login
  const currentStreak = extra.currentStreak || profile?.progress_streak || 0;
  const loginStreak   = extra.loginStreak   || profile?.login_streak    || 0;
  const activeWeeks   = extra.activeWeeks   || 0;

  // Comments (from extra)
  const totalComments = extra.totalComments || 0;

  // Profile
  const profileComplete    = !!(profile?.username && profile?.avatar_url && profile?.bio);
  const hasAvatar          = !!profile?.avatar_url;
  const hasBanner          = !!profile?.banner_url;
  const hasSelectedBadge   = !!(profile?.selected_badge_id && profile.selected_badge_id !== "");
  const favoritesCount     = (profile?.favorite_animes?.length || 0) + (profile?.favorite_mangas?.length || 0);

  // Misc
  const updatedStatuses = entries.filter((e) => e.status !== "planned").length;
  const resumedFromHold = entries.filter((e) => e.status === "watching" || e.status === "reading").length > 0 ? 1 : 0;
  const completedFromHold = extra.completedFromHold || 0;
  const movedFromPlanned  = entries.filter((e) => ["watching","reading","completed"].includes(e.status)).length;
  const sameDayComplete   = extra.sameDayComplete || 0;

  // Founder
  const isFounder = extra.isFounder || false;

  // Level (needed for level achievements — computed externally and passed via extra)
  const currentLevel = extra.currentLevel || 1;

  return {
    totalEpisodes, totalChapters, totalMovies, completedTitles, completedAnime, completedManga, totalTitles,
    plannedTitles, updatedStatuses, hasAnime, hasManga, hasMovie, hasLiveaction,
    categoryCount, uniqueGenres, sameWorkBothTypes, completedLongAnime, completedLongManga,
    totalPosts, theoryPosts, reviewPosts, likesGiven, likesReceived, maxLikesOnPost,
    commentsReceived, friendsCount, friendRequestsSent,
    communitiesJoined, communitiesCreated, communityMaxMembers, communityPosts,
    eventsJoined, eventsCreated, animeEventsJoined, mangaEventsJoined,
    watchTogetherCount, watchTogetherCompleted,
    currentStreak, loginStreak, activeWeeks, totalComments,
    profileComplete, hasAvatar, hasBanner, hasSelectedBadge, favoritesCount,
    resumedFromHold, completedFromHold, movedFromPlanned, sameDayComplete,
    isFounder, currentLevel,
  };
}

export function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((a) => a.condition(stats));
}

// LEGACY/DERIVED XP CALCULATOR — used for baseline migration and validation only.
// After baseline migration, ranking authority is SUM(XpEvent.xp_amount) via getTotalXpFromEvents.
// Do NOT use computeTotalXp as the ranking authority after migration.
export function computeTotalXp(stats) {
  let xp = 0;
  xp += stats.totalEpisodes * XP_REWARDS.episode_watched;
  xp += stats.totalChapters * XP_REWARDS.chapter_read;
  xp += (stats.completedAnime || 0) * XP_REWARDS.anime_completed;
  xp += (stats.completedManga || 0) * XP_REWARDS.manga_completed;
  xp += stats.totalPosts * XP_REWARDS.post_created;
  xp += stats.totalTitles * XP_REWARDS.anime_added;
  const unlocked = ACHIEVEMENTS.filter((a) => a.condition(stats));
  xp += unlocked.reduce((s, a) => s + a.xp, 0);
  return Math.floor(xp);
}