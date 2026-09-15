// ============================================================
// grantXp — Sole authority for DIRECT XP granting
// ============================================================
// Handles ONLY independent XP events:
//   - post_created
//   - anime_added
//   - level_up
//   - legacy_migration (admin-only)
//
// Progress-related XP (episodes, chapters, ranges, completion) is
// handled EXCLUSIVELY by updateProgress.
// Achievement XP is handled EXCLUSIVELY by unlockAchievement.
//
// grantXp does NOT accept these event types:
//   episode_watched, chapter_read, episode_range, chapter_range,
//   work_completed, achievement_unlocked
// ============================================================

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  XP_REWARDS, updateStreak, findExisting, createEvent,
} from "../../shared/xpConstants.ts";

const VALID_EVENT_TYPES = new Set([
  "post_created", "anime_added", "level_up", "legacy_migration",
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

    const { event_type, source_id } = body;

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

    return Response.json({ status: "INVALID_EVENT_TYPE" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ status: "ERROR", error: error?.message || "Unknown error" }, { status: 500 });
  }
}