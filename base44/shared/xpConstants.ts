// ============================================================
// xpConstants.ts — Shared XP constants and helpers
// ============================================================
// Imported by grantXp, unlockAchievement, updateProgress.
// Single source of truth for XP values, idempotency helpers,
// streak update, and canonical total resolution.
// ============================================================

export const XP_REWARDS = {
  episode_watched: 10,
  chapter_read: 7,
  anime_completed: 150,
  manga_completed: 100,
  post_created: 20,
  anime_added: 15,
};

export const ACHIEVEMENT_XP: Record<string, number> = {
  first_episode: 50, ep_10: 80, ep_50: 150, ep_100: 250, ep_500: 500, ep_1000: 1000,
  first_chapter: 40, ch_20: 80, ch_100: 200, ch_500: 450, ch_1000: 900,
  first_movie: 60, movie_10: 120, movie_25: 250, movie_50: 500,
  first_add: 20, list_5: 40, list_10: 80, list_25: 150, list_50: 300, list_100: 500,
  first_complete: 100, complete_5: 200, complete_10: 300, complete_25: 500, four_categories: 120, planned_10: 80,
  streak_3: 100, streak_7: 250, streak_30: 600, login_3: 60, login_7: 150, login_30: 400, streak_weeks_4: 300,
  first_friend: 50, friends_5: 100, friends_10: 200, friends_25: 400, first_post: 30,
  post_liked_5: 80, post_liked_10: 150, post_10: 120, first_comment: 25, comment_received: 50,
  first_community: 40, watch_together_first: 60, watch_together_done: 100, friend_request_sent: 20,
  post_community_10: 150, founded_community: 100, community_10m: 250, first_event: 60, create_event: 80, communities_5: 150,
  both_types: 60, multimedia: 120, five_genres: 200, movie_and_live: 80, same_work_types: 150, long_anime: 300, long_manga: 300,
  profile_complete: 80, has_avatar: 40, has_banner: 40, has_badge: 30, level_5: 100, level_10: 200, level_25: 500, level_50: 1000,
  founder: 500, same_day_complete: 200, complete_100: 2000, max_level: 5000, otaku_supreme: 2000,
};

// ── Level calculation ──
const BASE_XP = 100;
const EXPONENT = 1.6;

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * Math.pow(level - 1, EXPONENT));
}

export function getLevelFromXp(xp: number): number {
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

// ── Streak update (only on GRANTED — never on ALREADY_GRANTED) ──
export async function updateStreak(svc: any, userEmail: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const profiles = await svc.entities.UserProfile.filter({ user_email: userEmail });
  const profile = profiles?.[0];
  if (!profile) return;
  const lastActivity = profile.last_activity_date;
  if (lastActivity === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak = profile.current_streak || 0;
  if (lastActivity === yesterday) newStreak += 1;
  else newStreak = 1;
  await svc.entities.UserProfile.update(profile.id, {
    last_activity_date: today,
    current_streak: newStreak,
  });
}

// ── Idempotency check (best-effort — race condition possible) ──
export async function findExisting(svc: any, userEmail: string, key: string): Promise<any> {
  const existing = await svc.entities.XpEvent.filter({
    user_email: userEmail,
    idempotency_key: key,
  });
  return existing?.[0] || null;
}

// ── Create XpEvent (service role bypasses RLS) ──
export async function createEvent(
  svc: any, userEmail: string, eventType: string, xpAmount: number,
  sourceType: string | null, sourceId: string | null, key: string, achievementId: string | null
): Promise<void> {
  await svc.entities.XpEvent.create({
    user_email: userEmail,
    event_type: eventType,
    xp_amount: xpAmount,
    event_date: new Date().toISOString(),
    source_type: sourceType || null,
    source_id: sourceId || null,
    idempotency_key: key,
    achievement_id: achievementId || null,
  });
}

// ── Canonical total from WorkRelease (authority) or entry (fallback) ──
export async function getCanonicalTotal(svc: any, entry: any, isManga: boolean): Promise<number> {
  if (entry.release_id) {
    try {
      const release = await svc.entities.WorkRelease.get(entry.release_id);
      if (release) {
        const total = isManga ? (release.chapter_count || 0) : (release.episode_count || 0);
        if (total > 0) return total;
      }
    } catch {}
  }
  return isManga ? (entry.total_chapters || 0) : (entry.total_episodes || 0);
}

// ── Get WorkRelease for airing check ──
export async function getWorkRelease(svc: any, entry: any): Promise<any | null> {
  if (!entry.release_id) return null;
  try {
    return await svc.entities.WorkRelease.get(entry.release_id);
  } catch {
    return null;
  }
}