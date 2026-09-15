// ============================================================
// grantXp — SOLE AUTHORITY for XP granting (P0 Security Hardening)
// ============================================================
// The client NEVER creates XpEvent directly. All XP granting
// goes through this backend function, which:
//   1. Authenticates via base44.auth.me() (never trusts client userEmail)
//   2. Validates event_type against a whitelist
//   3. Validates source ownership (entry/post belongs to user)
//   4. Calculates xp_amount server-side (client never sends it)
//   5. Builds idempotency_key server-side (client never sends it)
//   6. Checks idempotency (best-effort — no UNIQUE constraint in Base44)
//   7. Creates XpEvent with service role (bypasses RLS)
//   8. Updates streak ONLY when a new event is GRANTED
//   9. Returns a structured result
//
// TARGET: Supabase RPC grant_xp with UNIQUE(user_id, idempotency_key)
// ============================================================

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ── Server-side XP authority (must match src/lib/xpSystem.js for display) ──
const XP_REWARDS = {
  episode_watched: 10,
  chapter_read: 7,
  anime_completed: 150,
  manga_completed: 100,
  post_created: 20,
  anime_added: 15,
};

// ── Achievement XP map (must match src/lib/achievements.js) ──
// Backend is authoritative; frontend copy is display-only.
const ACHIEVEMENT_XP: Record<string, number> = {
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

const VALID_EVENT_TYPES = new Set([
  "episode_watched", "chapter_read", "episode_range", "chapter_range",
  "post_created", "anime_added", "work_completed", "achievement_unlocked",
  "level_up", "legacy_migration",
]);

// ── Streak update (only on GRANTED — never on ALREADY_GRANTED) ──
async function updateStreak(svc: any, userEmail: string) {
  const today = new Date().toISOString().slice(0, 10);
  const profiles = await svc.entities.UserProfile.filter({ user_email: userEmail });
  const profile = profiles?.[0];
  if (!profile) return;
  const lastActivity = profile.last_activity_date;
  if (lastActivity === today) return; // already updated today
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
async function findExisting(svc: any, userEmail: string, key: string) {
  const existing = await svc.entities.XpEvent.filter({
    user_email: userEmail,
    idempotency_key: key,
  });
  return existing?.[0] || null;
}

// ── Create event (service role bypasses RLS) ──
async function createEvent(
  svc: any, userEmail: string, eventType: string, xpAmount: number,
  sourceType: string | null, sourceId: string | null, key: string, achievementId: string | null
) {
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
async function getCanonicalTotal(svc: any, entry: any, isManga: boolean): Promise<number> {
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

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ status: "UNAUTHORIZED" }, { status: 401 });

    const svc = base44.asServiceRole;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ status: "INVALID_BODY" }, { status: 400 });
    }

    const { event_type, source_type, source_id, unit_number, from, to } = body;

    if (!VALID_EVENT_TYPES.has(event_type)) {
      return Response.json({ status: "INVALID_EVENT_TYPE" }, { status: 400 });
    }

    // ── legacy_migration: admin-only ──
    if (event_type === "legacy_migration") {
      if (user.role !== "admin") {
        return Response.json({ status: "FORBIDDEN" }, { status: 403 });
      }
      const key = body.idempotency_key || `legacy-xp-baseline-v1:${user.email}`;
      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: existing.xp_amount, idempotency_key: key });
      const xpAmount = Number(body.xp_amount) || 0;
      await createEvent(svc, user.email, "legacy_migration", xpAmount, "legacy_migration", null, key, null);
      return Response.json({ status: "GRANTED", xp_amount: xpAmount, idempotency_key: key });
    }

    // ── level_up: XP = 0 ──
    if (event_type === "level_up") {
      const lvl = Number(body.level) || 0;
      const key = `levelup:${user.email}:${lvl}`;
      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: 0, idempotency_key: key });
      await createEvent(svc, user.email, "level_up", 0, "level_up", String(lvl), key, null);
      return Response.json({ status: "GRANTED", xp_amount: 0, idempotency_key: key });
    }

    // ── Range events (episode_range / chapter_range) ──
    if (event_type === "episode_range" || event_type === "chapter_range") {
      const isChapter = event_type === "chapter_range";
      const singleType = isChapter ? "chapter_read" : "episode_watched";
      const prefix = isChapter ? "chapter" : "episode";

      if (!source_id) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      let entry: any;
      try {
        entry = await svc.entities.AnimeEntry.get(source_id);
      } catch {
        return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      }
      if (!entry) return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      if (entry.created_by !== user.email) return Response.json({ status: "SOURCE_NOT_OWNED" }, { status: 403 });

      const f = Number(from) || 0;
      const t = Number(to) || 0;
      if (f < 0 || t < 1 || t <= f) return Response.json({ status: "INVALID_RANGE" }, { status: 400 });

      const currentProgress = isChapter ? (entry.current_chapter || 0) : (entry.current_episode || 0);
      if (t > currentProgress) return Response.json({ status: "PROGRESS_NOT_REACHED" }, { status: 400 });

      const canonicalTotal = await getCanonicalTotal(svc, entry, isChapter);
      if (canonicalTotal > 0 && t > canonicalTotal) return Response.json({ status: "OUT_OF_RANGE" }, { status: 400 });

      const xpPerUnit = isChapter ? XP_REWARDS.chapter_read : XP_REWARDS.episode_watched;
      let grantedCount = 0;
      let alreadyGrantedCount = 0;
      let xpGranted = 0;

      for (let n = f + 1; n <= t; n++) {
        const key = `${prefix}:${source_id}:${n}`;
        const existing = await findExisting(svc, user.email, key);
        if (existing) {
          alreadyGrantedCount++;
          continue;
        }
        await createEvent(svc, user.email, singleType, xpPerUnit, "anime_entry", source_id, key, null);
        grantedCount++;
        xpGranted += xpPerUnit;
      }

      if (grantedCount > 0) {
        await updateStreak(svc, user.email);
      }

      return Response.json({
        status: grantedCount > 0 ? "GRANTED" : "ALREADY_GRANTED",
        granted_count: grantedCount,
        already_granted_count: alreadyGrantedCount,
        xp_granted: xpGranted,
      });
    }

    // ── Single episode/chapter ──
    if (event_type === "episode_watched" || event_type === "chapter_read") {
      const isChapter = event_type === "chapter_read";
      const prefix = isChapter ? "chapter" : "episode";

      if (!source_id || !unit_number) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      let entry: any;
      try {
        entry = await svc.entities.AnimeEntry.get(source_id);
      } catch {
        return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      }
      if (!entry) return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      if (entry.created_by !== user.email) return Response.json({ status: "SOURCE_NOT_OWNED" }, { status: 403 });

      const n = Number(unit_number);
      if (n < 1) return Response.json({ status: "INVALID_UNIT" }, { status: 400 });

      const currentProgress = isChapter ? (entry.current_chapter || 0) : (entry.current_episode || 0);
      if (n > currentProgress) return Response.json({ status: "PROGRESS_NOT_REACHED" }, { status: 400 });

      const canonicalTotal = await getCanonicalTotal(svc, entry, isChapter);
      if (canonicalTotal > 0 && n > canonicalTotal) return Response.json({ status: "OUT_OF_RANGE" }, { status: 400 });

      const key = `${prefix}:${source_id}:${n}`;
      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: existing.xp_amount, idempotency_key: key });

      const xpAmount = isChapter ? XP_REWARDS.chapter_read : XP_REWARDS.episode_watched;
      await createEvent(svc, user.email, event_type, xpAmount, "anime_entry", source_id, key, null);
      await updateStreak(svc, user.email);

      return Response.json({ status: "GRANTED", xp_amount: xpAmount, idempotency_key: key });
    }

    // ── work_completed ──
    if (event_type === "work_completed") {
      if (!source_id) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      let entry: any;
      try {
        entry = await svc.entities.AnimeEntry.get(source_id);
      } catch {
        return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      }
      if (!entry) return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      if (entry.created_by !== user.email) return Response.json({ status: "SOURCE_NOT_OWNED" }, { status: 403 });
      if (entry.status !== "completed") return Response.json({ status: "NOT_COMPLETED" }, { status: 400 });

      const isManga = entry.type === "manga";
      const xpAmount = isManga ? XP_REWARDS.manga_completed : XP_REWARDS.anime_completed;
      const key = `completion:${source_id}`;

      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: existing.xp_amount, idempotency_key: key });

      await createEvent(svc, user.email, "work_completed", xpAmount, "anime_entry", source_id, key, null);
      await updateStreak(svc, user.email);

      return Response.json({ status: "GRANTED", xp_amount: xpAmount, idempotency_key: key });
    }

    // ── anime_added ──
    if (event_type === "anime_added") {
      if (!source_id) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      let entry: any;
      try {
        entry = await svc.entities.AnimeEntry.get(source_id);
      } catch {
        return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      }
      if (!entry) return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      if (entry.created_by !== user.email) return Response.json({ status: "SOURCE_NOT_OWNED" }, { status: 403 });

      const key = `entry:${source_id}:created`;
      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: existing.xp_amount, idempotency_key: key });

      await createEvent(svc, user.email, "anime_added", XP_REWARDS.anime_added, "anime_entry", source_id, key, null);
      await updateStreak(svc, user.email);

      return Response.json({ status: "GRANTED", xp_amount: XP_REWARDS.anime_added, idempotency_key: key });
    }

    // ── post_created ──
    if (event_type === "post_created") {
      if (!source_id) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      let post: any;
      try {
        post = await svc.entities.Post.get(source_id);
      } catch {
        return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      }
      if (!post) return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
      if (post.created_by !== user.email) return Response.json({ status: "SOURCE_NOT_OWNED" }, { status: 403 });

      const key = `post:${source_id}:create`;
      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: existing.xp_amount, idempotency_key: key });

      await createEvent(svc, user.email, "post_created", XP_REWARDS.post_created, "post", source_id, key, null);
      await updateStreak(svc, user.email);

      return Response.json({ status: "GRANTED", xp_amount: XP_REWARDS.post_created, idempotency_key: key });
    }

    // ── achievement_unlocked ──
    if (event_type === "achievement_unlocked") {
      const achievementId = source_id;
      if (!achievementId) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      const xpAmount = ACHIEVEMENT_XP[achievementId];
      if (xpAmount == null) return Response.json({ status: "INVALID_ACHIEVEMENT" }, { status: 400 });

      // Validate UserAchievement exists for this user
      const userAch = await svc.entities.UserAchievement.filter({
        user_email: user.email,
        achievement_key: achievementId,
      });
      if (!userAch || userAch.length === 0) {
        return Response.json({ status: "ACHIEVEMENT_NOT_UNLOCKED" }, { status: 403 });
      }

      const key = `achievement:${achievementId}`;
      const existing = await findExisting(svc, user.email, key);
      if (existing) return Response.json({ status: "ALREADY_GRANTED", xp_amount: existing.xp_amount, idempotency_key: key });

      await createEvent(svc, user.email, "achievement_unlocked", xpAmount, "achievement", achievementId, key, achievementId);
      await updateStreak(svc, user.email);

      return Response.json({ status: "GRANTED", xp_amount: xpAmount, idempotency_key: key });
    }

    return Response.json({ status: "INVALID_EVENT_TYPE" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ status: "ERROR", error: error?.message || "Unknown error" }, { status: 500 });
  }
}