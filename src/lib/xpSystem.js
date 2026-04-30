// ============================================================
// XP SYSTEM ENGINE
// ============================================================

// XP earned per action
export const XP_REWARDS = {
  episode_watched: 10,       // +10 XP per episode
  chapter_read: 7,           // +7 XP per chapter
  anime_completed: 150,      // +150 XP bonus on completing anime
  manga_completed: 100,      // +100 XP bonus on completing manga
  post_created: 20,          // +20 XP per post
  anime_added: 15,           // +15 XP when adding to list
};

// Levels: each level needs progressively more XP (exponential curve)
// XP required = base * (level ^ exponent)
const BASE_XP = 100;
const EXPONENT = 1.6;

export function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * Math.pow(level - 1, EXPONENT));
}

export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpRequiredForLevel(i);
  }
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

// ============================================================
// RANK TITLES  (shown publicly on profile)
// ============================================================
export const RANKS = [
  { minLevel: 1,  title: "Novato",           color: "text-muted-foreground",  bg: "bg-muted/30",         border: "border-border"             },
  { minLevel: 5,  title: "Iniciante Otaku",  color: "text-chart-2",           bg: "bg-chart-2/10",       border: "border-chart-2/30"         },
  { minLevel: 10, title: "Assistidor Ávido", color: "text-primary",           bg: "bg-primary/10",       border: "border-primary/30"         },
  { minLevel: 20, title: "Mestre do Shonen", color: "text-chart-4",           bg: "bg-chart-4/10",       border: "border-chart-4/30"         },
  { minLevel: 35, title: "Lenda da Cultura", color: "text-chart-5",           bg: "bg-chart-5/10",       border: "border-chart-5/30"         },
  { minLevel: 50, title: "Deus Otaku",       color: "text-yellow-400",        bg: "bg-yellow-400/10",    border: "border-yellow-400/40"      },
  { minLevel: 75, title: "Transcendente",    color: "text-purple-400",        bg: "bg-purple-400/10",    border: "border-purple-400/40"      },
];

export function getRankForLevel(level) {
  const rank = [...RANKS].reverse().find((r) => level >= r.minLevel);
  return rank || RANKS[0];
}

// ============================================================
// ACHIEVEMENTS DEFINITION
// ============================================================
export const ACHIEVEMENTS = [
  // Watching
  { id: "first_episode",    emoji: "▶️",  label: "Primeiro Play",       desc: "Assista seu primeiro episódio",                  xp: 50,   condition: (s) => s.totalEpisodes >= 1        },
  { id: "ep_10",            emoji: "📺",  label: "Maratonista",          desc: "Assista 10 episódios",                           xp: 80,   condition: (s) => s.totalEpisodes >= 10       },
  { id: "ep_50",            emoji: "🎬",  label: "Viciado em Série",     desc: "Assista 50 episódios",                           xp: 150,  condition: (s) => s.totalEpisodes >= 50       },
  { id: "ep_100",           emoji: "🔥",  label: "Sem Parar",            desc: "Assista 100 episódios",                          xp: 250,  condition: (s) => s.totalEpisodes >= 100      },
  { id: "ep_500",           emoji: "⚡",  label: "Lenda da Maratona",    desc: "Assista 500 episódios",                          xp: 500,  condition: (s) => s.totalEpisodes >= 500      },
  { id: "ep_1000",          emoji: "👑",  label: "Mestre dos Animes",    desc: "Assista 1000 episódios",                         xp: 1000, condition: (s) => s.totalEpisodes >= 1000     },
  // Reading
  { id: "first_chapter",   emoji: "📖",  label: "Primeiro Capítulo",    desc: "Leia seu primeiro capítulo",                     xp: 40,   condition: (s) => s.totalChapters >= 1        },
  { id: "ch_20",            emoji: "📚",  label: "Leitor Casual",        desc: "Leia 20 capítulos",                              xp: 80,   condition: (s) => s.totalChapters >= 20       },
  { id: "ch_100",           emoji: "🧠",  label: "Devorador de Páginas", desc: "Leia 100 capítulos",                             xp: 200,  condition: (s) => s.totalChapters >= 100      },
  { id: "ch_500",           emoji: "🌀",  label: "Mestre do Mangá",      desc: "Leia 500 capítulos",                             xp: 450,  condition: (s) => s.totalChapters >= 500      },
  // Completions
  { id: "first_complete",  emoji: "✅",  label: "Missão Cumprida",      desc: "Conclua seu primeiro anime ou mangá",            xp: 100,  condition: (s) => s.completedTitles >= 1      },
  { id: "complete_5",      emoji: "🏅",  label: "Colecionador",         desc: "Conclua 5 títulos",                              xp: 200,  condition: (s) => s.completedTitles >= 5      },
  { id: "complete_20",     emoji: "🥇",  label: "Veterano",             desc: "Conclua 20 títulos",                             xp: 400,  condition: (s) => s.completedTitles >= 20     },
  { id: "complete_50",     emoji: "🏆",  label: "Grande Mestre",        desc: "Conclua 50 títulos",                             xp: 800,  condition: (s) => s.completedTitles >= 50     },
  // Social
  { id: "first_post",      emoji: "💬",  label: "Voz da Comunidade",    desc: "Publique seu primeiro post",                     xp: 30,   condition: (s) => s.totalPosts >= 1           },
  { id: "post_10",         emoji: "🗣️", label: "Influencer Otaku",     desc: "Publique 10 posts",                              xp: 120,  condition: (s) => s.totalPosts >= 10          },
  // Diversity
  { id: "both_types",      emoji: "⚖️", label: "Equilibrista",         desc: "Tenha ao menos 1 anime e 1 mangá na lista",      xp: 60,   condition: (s) => s.hasAnime && s.hasManga    },
  { id: "list_10",         emoji: "📋",  label: "Coleção Crescente",    desc: "Tenha 10 títulos na sua lista",                  xp: 100,  condition: (s) => s.totalTitles >= 10         },
  { id: "list_50",         emoji: "🗂️", label: "Biblioteca Viva",      desc: "Tenha 50 títulos na sua lista",                  xp: 300,  condition: (s) => s.totalTitles >= 50         },
];

// Compute stats object from entries + posts
export function computeStats(entries, posts) {
  const myAnime = entries.filter((e) => e.type === "anime");
  const myManga = entries.filter((e) => e.type === "manga");

  const totalEpisodes = myAnime.reduce((s, e) => s + (e.current_episode || 0), 0);
  const totalChapters = myManga.reduce((s, e) => s + (e.current_chapter || 0), 0);
  const completedTitles = entries.filter((e) => e.status === "completed").length;
  const totalTitles = entries.length;
  const hasAnime = myAnime.length > 0;
  const hasManga = myManga.length > 0;
  const totalPosts = posts.length;

  return { totalEpisodes, totalChapters, completedTitles, totalTitles, hasAnime, hasManga, totalPosts };
}

// Return which achievements are unlocked
export function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((a) => a.condition(stats));
}

// Compute total XP from stats
export function computeTotalXp(stats) {
  let xp = 0;
  xp += stats.totalEpisodes * XP_REWARDS.episode_watched;
  xp += stats.totalChapters * XP_REWARDS.chapter_read;
  xp += stats.completedTitles * (XP_REWARDS.anime_completed + XP_REWARDS.manga_completed) / 2;
  xp += stats.totalPosts * XP_REWARDS.post_created;
  xp += stats.totalTitles * XP_REWARDS.anime_added;
  // bonus from achievements
  const unlocked = getUnlockedAchievements(stats);
  xp += unlocked.reduce((s, a) => s + a.xp, 0);
  return Math.floor(xp);
}