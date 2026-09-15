// ============================================================
// updateProgress — Backend authority for progress + XP atomicity
// ============================================================
// The client NO LONGER updates AnimeEntry.current_episode,
// current_chapter, or status="completed" directly.
// All progress changes go through this function, which:
//   1. Authenticates via base44.auth.me()
//   2. Fetches AnimeEntry, validates ownership
//   3. Resolves WorkRelease canonical total (authority)
//   4. Validates new progress against canonical total
//   5. Updates AnimeEntry (service role)
//   6. Creates XpEvent(s) for the delta (per-unit idempotency)
//   7. Handles auto-completion (respects airing status)
//   8. Updates streak only when XP is granted
//   9. Returns structured result with real XP granted
//
// Actions:
//   "increment"     — current + 1
//   "decrement"     — current - 1 (no XP removal)
//   "set_progress"  — set to value
//   "complete"      — set to total + status completed
// ============================================================

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  XP_REWARDS, updateStreak, findExisting, createEvent,
  getCanonicalTotal, getWorkRelease,
} from "../../shared/xpConstants.ts";

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

    const { entry_id, action, value } = body;
    if (!entry_id || !action) return Response.json({ status: "INVALID_PARAMS" }, { status: 400 });

    // Fetch entry
    let entry: any;
    try {
      entry = await svc.entities.AnimeEntry.get(entry_id);
    } catch {
      return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
    }
    if (!entry) return Response.json({ status: "SOURCE_NOT_FOUND" }, { status: 404 });
    if (entry.created_by !== user.email) return Response.json({ status: "SOURCE_NOT_OWNED" }, { status: 403 });

    const isManga = entry.type === "manga";
    const progressKey = isManga ? "current_chapter" : "current_episode";
    const totalKey = isManga ? "total_chapters" : "total_episodes";
    const current = entry[progressKey] || 0;
    const canonicalTotal = await getCanonicalTotal(svc, entry, isManga);
    const release = await getWorkRelease(svc, entry);
    const isAiring = release?.status === "releasing";

    let newProgress = current;
    let completed = false;
    let statusChanged = false;

    // ── Compute new progress based on action ──
    if (action === "increment") {
      newProgress = current + 1;
      if (canonicalTotal > 0 && newProgress > canonicalTotal) {
        return Response.json({ status: "OUT_OF_RANGE", progress: current }, { status: 400 });
      }
    } else if (action === "decrement") {
      newProgress = Math.max(0, current - 1);
    } else if (action === "set_progress") {
      newProgress = Number(value) || 0;
      if (newProgress < 0) return Response.json({ status: "INVALID_VALUE" }, { status: 400 });
      if (canonicalTotal > 0 && newProgress > canonicalTotal) {
        return Response.json({ status: "OUT_OF_RANGE", progress: current }, { status: 400 });
      }
    } else if (action === "complete") {
      newProgress = canonicalTotal > 0 ? canonicalTotal : current;
      completed = true;
    } else {
      return Response.json({ status: "INVALID_ACTION" }, { status: 400 });
    }

    // ── Determine auto-completion ──
    // Don't auto-complete airing works (total may grow)
    const shouldComplete = completed || (!isAiring && canonicalTotal > 0 && newProgress >= canonicalTotal);

    // ── Update entry ──
    const updates: any = { [progressKey]: newProgress };
    if (canonicalTotal > 0) updates[totalKey] = canonicalTotal;
    if (shouldComplete && entry.status !== "completed") {
      updates.status = "completed";
      completed = true;
      statusChanged = true;
    } else if (action === "decrement" && entry.status === "completed" && canonicalTotal > 0 && newProgress < canonicalTotal) {
      updates.status = isManga ? "reading" : "watching";
      statusChanged = true;
    }
    await svc.entities.AnimeEntry.update(entry_id, updates);

    // ── Grant XP for episodes in the range (current+1 .. newProgress) ──
    let xpGranted = 0;
    if (newProgress > current) {
      const prefix = isManga ? "chapter" : "episode";
      const singleType = isManga ? "chapter_read" : "episode_watched";
      const xpPerUnit = isManga ? XP_REWARDS.chapter_read : XP_REWARDS.episode_watched;
      for (let n = current + 1; n <= newProgress; n++) {
        const key = `${prefix}:${entry_id}:${n}`;
        const existing = await findExisting(svc, user.email, key);
        if (existing) continue;
        await createEvent(svc, user.email, singleType, xpPerUnit, "anime_entry", entry_id, key, null);
        xpGranted += xpPerUnit;
      }
    }

    // ── Grant completion XP (idempotent) ──
    let completionXpGranted = 0;
    if (completed) {
      const compKey = `completion:${entry_id}`;
      const existingComp = await findExisting(svc, user.email, compKey);
      if (!existingComp) {
        const compXp = isManga ? XP_REWARDS.manga_completed : XP_REWARDS.anime_completed;
        await createEvent(svc, user.email, "work_completed", compXp, "anime_entry", entry_id, compKey, null);
        completionXpGranted = compXp;
      }
    }

    // ── Update streak only if XP was granted ──
    if (xpGranted > 0 || completionXpGranted > 0) {
      await updateStreak(svc, user.email);
    }

    return Response.json({
      status: (xpGranted > 0 || completionXpGranted > 0) ? "GRANTED" : "ALREADY_GRANTED",
      progress: newProgress,
      xp_granted: xpGranted,
      completion_xp_granted: completionXpGranted,
      total_xp_granted: xpGranted + completionXpGranted,
      completed,
      status_changed: statusChanged,
    });
  } catch (error: any) {
    return Response.json({ status: "ERROR", error: error?.message || "Unknown error" }, { status: 500 });
  }
}