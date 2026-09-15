// ============================================================
// progressApi.js — Frontend helpers for backend progress + achievement
// ============================================================
// Thin wrappers that invoke the backend functions and normalize
// the response. The client NEVER updates progress or unlocks
// achievements directly — everything goes through these helpers.
// ============================================================

import { base44 } from "@/api/base44Client";

// ── updateProgress — progress + XP atomicity ──
// Actions: "increment", "decrement", "set_progress", "complete"
// Returns: { status, progress, xp_granted, completion_xp_granted, total_xp_granted, completed, status_changed }
export async function updateProgress({ entryId, action, value }) {
  try {
    const response = await base44.functions.invoke("updateProgress", {
      entry_id: entryId,
      action,
      value,
    });
    return response.data || response;
  } catch (e) {
    return { status: "ERROR", error: e };
  }
}

// ── unlockAchievement — achievement validation + unlock ──
// Returns: { status, xp_amount, achievement_id }
export async function unlockAchievement({ achievementId }) {
  try {
    const response = await base44.functions.invoke("unlockAchievement", {
      achievement_id: achievementId,
    });
    return response.data || response;
  } catch (e) {
    return { status: "ERROR", error: e };
  }
}