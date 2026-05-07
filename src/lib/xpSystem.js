// ============================================================
// XP SYSTEM ENGINE
// ============================================================

import { ACHIEVEMENTS, getAchievementColor } from "./achievements";
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
export function computeStats(entries, posts, friendships = [], events = [], profile = null) {
  const myAnime = entries.filter((e) => e.type === "anime");
  const myManga = entries.filter((e) => e.type === "manga");
  const myMovies = entries.filter((e) => e.type === "movie");

  const totalEpisodes = myAnime.reduce((s, e) => s + (e.current_episode || 0), 0);
  const totalChapters = myManga.reduce((s, e) => s + (e.current_chapter || 0), 0);
  const totalMovies = myMovies.filter((e) => e.status === "completed").length;
  const completedTitles = entries.filter((e) => e.status === "completed").length;
  const totalTitles = entries.length;
  const plannedTitles = entries.filter((e) => e.status === "planned").length;
  const updatedStatuses = entries.filter((e) => e.status !== "planned").length;
  const hasAnime = myAnime.length > 0;
  const hasManga = myManga.length > 0;
  const hasMovie = myMovies.length > 0;
  const totalPosts = posts.length;
  const theoryPosts = posts.filter((p) => p.post_type === "theory").length;
  const reviewPosts = posts.filter((p) => p.post_type === "review").length;
  const likesGiven = 0; // not tracked yet
  const likesReceived = posts.reduce((s, p) => s + (p.likes_count || 0), 0);
  const maxLikesOnPost = posts.reduce((m, p) => Math.max(m, p.likes_count || 0), 0);
  const friendsCount = friendships.filter((f) => f.status === "accepted").length;
  const communitiesJoined = 0; // extend when needed
  const communitiesCreated = 0;
  const communityMaxMembers = 0;
  const eventsJoined = events.length;
  const animeEventsJoined = events.filter((e) => e.media_type === "anime").length;
  const mangaEventsJoined = events.filter((e) => e.media_type === "manga").length;
  const currentStreak = 0; // extend when needed
  const activeWeeks = 0;
  const totalComments = 0; // extend when needed
  const resumedFromHold = entries.filter((e) => e.status === "watching" || e.status === "reading").length > 0 ? 1 : 0;
  const completedFromHold = 0;
  const movedFromPlanned = entries.filter((e) => ["watching","reading","completed"].includes(e.status)).length;
  const favoritesCount = (profile?.favorite_animes?.length || 0) + (profile?.favorite_mangas?.length || 0);
  const profileComplete = !!(profile?.username && profile?.avatar_url && profile?.bio);

  return {
    totalEpisodes, totalChapters, totalMovies, completedTitles, totalTitles,
    plannedTitles, updatedStatuses, hasAnime, hasManga, hasMovie,
    totalPosts, theoryPosts, reviewPosts, likesGiven, likesReceived, maxLikesOnPost,
    friendsCount, communitiesJoined, communitiesCreated, communityMaxMembers,
    eventsJoined, animeEventsJoined, mangaEventsJoined, currentStreak, activeWeeks,
    totalComments, resumedFromHold, completedFromHold, movedFromPlanned,
    favoritesCount, profileComplete,
  };
}

export function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((a) => a.condition(stats));
}

export function computeTotalXp(stats) {
  let xp = 0;
  xp += stats.totalEpisodes * XP_REWARDS.episode_watched;
  xp += stats.totalChapters * XP_REWARDS.chapter_read;
  xp += stats.completedTitles * (XP_REWARDS.anime_completed + XP_REWARDS.manga_completed) / 2;
  xp += stats.totalPosts * XP_REWARDS.post_created;
  xp += stats.totalTitles * XP_REWARDS.anime_added;
  const unlocked = ACHIEVEMENTS.filter((a) => a.condition(stats));
  xp += unlocked.reduce((s, a) => s + a.xp, 0);
  return Math.floor(xp);
}