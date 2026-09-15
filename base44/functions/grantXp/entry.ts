// ============================================================
// grantXp — Sole authority for direct XP granting
// ============================================================
// Handles: episode_watched, chapter_read, episode_range, chapter_range,
// post_created, anime_added, work_completed, achievement_unlocked,
// level_up, legacy_migration.
//
// NOTE: Progress-related XP (episode_watched, chapter_read, episode_range,
// chapter_range, work_completed) is now handled by updateProgress.
// This function still handles these for backward compatibility, but
// the frontend no longer calls grantXp for progress — it calls updateProgress.
//
// achievement_unlocked is now handled by unlockAchievement, which validates
// the condition server-side before creating UserAchievement + granting XP.
// This function still handles achievement_unlocked for backward compatibility.
// ============================================================

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  XP_REWARDS, ACHIEVEMENT_XP, updateStreak, findExisting, createEvent, getCanonicalTotal,
} from "../../shared/xpConstants.ts";

const VALID_EVENT_TYPES = new Set([
  "episode_watched", "chapter_read", "episode_range", "chapter_range",
  "post_created", "anime_added", "work_completed", "achievement_unlocked",
  "level_up", "legacy_migration",
]);

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

    // ── achievement_unlocked (backward compat — use unlockAchievement for new unlocks) ──
    if (event_type === "achievement_unlocked") {
      const achievementId = source_id;
      if (!achievementId) return Response.json({ status: "INVALID_SOURCE" }, { status: 400 });

      const xpAmount = ACHIEVEMENT_XP[achievementId];
      if (xpAmount == null) return Response.json({ status: "INVALID_ACHIEVEMENT" }, { status: 400 });

      // Validate UserAchievement exists
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