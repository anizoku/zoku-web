// ============================================================
// XP EVENT LEDGER — Canonical XP granting helper
// ============================================================
// All XP granting MUST go through grantXpEvent().
// Components never decide xp_amount — the helper resolves it
// from XP_REWARDS (or ACHIEVEMENTS for achievement_unlocked).
//
// Idempotency: each action has a unique idempotency_key.
// Before creating, the helper checks if an event with the same
// user_email + idempotency_key already exists.
// If it does: ALREADY_GRANTED (no duplicate).
//
// Base44 limitation: this check-then-create is NOT atomic
// (unlike Postgres UNIQUE constraint). Race conditions between
// double-clicks can still duplicate. Supabase target: UNIQUE
// constraint on (user_id, idempotency_key) for atomic safety.
// ============================================================

import { base44 } from "@/api/base44Client";
import { XP_REWARDS, computeStats, computeTotalXp } from "./xpSystem";
import { ACHIEVEMENTS } from "./achievements";

// ── XP amount resolution (internal — components never call this) ──
function resolveXpAmount(eventType, options = {}) {
  if (eventType === "level_up") return 0;
  if (eventType === "legacy_migration") return options.xpAmount || 0;
  if (eventType === "achievement_unlocked") {
    const ach = ACHIEVEMENTS.find((a) => a.id === options.achievementId);
    return ach?.xp || 0;
  }
  if (eventType === "work_completed") {
    return options.workType === "manga"
      ? XP_REWARDS.manga_completed
      : XP_REWARDS.anime_completed;
  }
  if (eventType === "episode_watched") {
    return XP_REWARDS.episode_watched * (options.count || 1);
  }
  if (eventType === "chapter_read") {
    return XP_REWARDS.chapter_read * (options.count || 1);
  }
  if (eventType === "post_created") return XP_REWARDS.post_created;
  if (eventType === "anime_added") return XP_REWARDS.anime_added;
  return 0;
}

// ── Streak update (side effect of XP-granting actions) ──────
async function updateStreak(userEmail) {
  if (!userEmail) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
    const profile = profiles?.[0];
    if (!profile) return;
    const lastActivity = profile.last_activity_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = profile.current_streak || 0;
    if (lastActivity === today) {
      // already updated today
    } else if (lastActivity === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
    await base44.entities.UserProfile.update(profile.id, {
      last_activity_date: today,
      current_streak: newStreak,
    });
  } catch {}
}

// ── Core: grantXpEvent ──────────────────────────────────────
// Returns { status: "GRANTED" | "ALREADY_GRANTED" | "INVALID" | "ERROR", xpAmount }
export async function grantXpEvent({
  userEmail,
  eventType,
  sourceType,
  sourceId,
  idempotencyKey,
  workType,        // "anime" | "manga" — for work_completed
  achievementId,   // for achievement_unlocked
  count,           // for bulk episode_watched / chapter_read
  xpAmount,        // ONLY for legacy_migration
}) {
  if (!userEmail || !eventType || !idempotencyKey) {
    return { status: "INVALID", xpAmount: 0 };
  }

  // Idempotency check
  try {
    const existing = await base44.entities.XpEvent.filter({
      user_email: userEmail,
      idempotency_key: idempotencyKey,
    });
    if (existing && existing.length > 0) {
      return { status: "ALREADY_GRANTED", xpAmount: existing[0].xp_amount || 0 };
    }
  } catch {
    // If filter fails, proceed (best-effort idempotency)
  }

  const resolvedXp = resolveXpAmount(eventType, { workType, achievementId, count, xpAmount });

  try {
    await base44.entities.XpEvent.create({
      user_email: userEmail,
      event_type: eventType,
      xp_amount: resolvedXp,
      event_date: new Date().toISOString(),
      source_type: sourceType || null,
      source_id: sourceId || null,
      idempotency_key: idempotencyKey,
      achievement_id: achievementId || null,
    });
  } catch (e) {
    return { status: "ERROR", xpAmount: 0, error: e };
  }

  // Streak side effect (fire-and-forget)
  updateStreak(userEmail).catch(() => {});

  return { status: "GRANTED", xpAmount: resolvedXp };
}

// ── Grant XP for an episode/chapter range (jump 5→8 = 6,7,8) ──
export async function grantEpisodeRange({
  userEmail,
  entryId,
  fromNum,
  toNum,
  eventType, // "episode_watched" or "chapter_read"
}) {
  const prefix = eventType === "chapter_read" ? "chapter" : "episode";
  const results = [];
  for (let n = fromNum + 1; n <= toNum; n++) {
    const r = await grantXpEvent({
      userEmail,
      eventType,
      sourceType: "anime_entry",
      sourceId: entryId,
      idempotencyKey: `${prefix}:${entryId}:${n}`,
    });
    results.push({ num: n, ...r });
  }
  return results;
}

// ── Ledger total from events ────────────────────────────────
export function getTotalXpFromEvents(events) {
  if (!Array.isArray(events)) return 0;
  return events.reduce((sum, ev) => sum + (ev.xp_amount || 0), 0);
}

// ── Period XP from events (excludes legacy_migration) ───────
export function getPeriodXpFromEvents(events, sinceDate) {
  if (!Array.isArray(events)) return 0;
  return events
    .filter(
      (ev) =>
        ev.event_type !== "legacy_migration" &&
        new Date(ev.event_date) >= sinceDate
    )
    .reduce((sum, ev) => sum + (ev.xp_amount || 0), 0);
}

// ── Idempotent UserAchievement + achievement XP ──────────────
export async function grantAchievement({ userEmail, achievementId }) {
  if (!userEmail || !achievementId) return { status: "INVALID" };

  // Check if UserAchievement already exists
  try {
    const existing = await base44.entities.UserAchievement.filter({
      user_email: userEmail,
      achievement_key: achievementId,
    });
    if (existing && existing.length > 0) {
      return { status: "ALREADY_GRANTED" };
    }
  } catch {}

  // Create UserAchievement
  try {
    await base44.entities.UserAchievement.create({
      user_email: userEmail,
      achievement_key: achievementId,
      unlocked_at: new Date().toISOString(),
    });
  } catch (e) {
    return { status: "ERROR", error: e };
  }

  // Grant achievement XP via ledger
  const xpResult = await grantXpEvent({
    userEmail,
    eventType: "achievement_unlocked",
    sourceType: "achievement",
    sourceId: achievementId,
    achievementId,
    idempotencyKey: `achievement:${achievementId}`,
  });

  return { status: "GRANTED", ...xpResult };
}

// ── Consistency check: derived vs ledger ───────────────────
export async function checkXpConsistency(userEmail) {
  const entries = await base44.entities.AnimeEntry.filter({ created_by: userEmail });
  const posts = await base44.entities.Post.filter({ created_by: userEmail });
  const events = await base44.entities.XpEvent.filter({ user_email: userEmail });

  const stats = computeStats(entries, posts);
  const derivedXp = computeTotalXp(stats);
  const ledgerXp = getTotalXpFromEvents(events);

  let status = "MATCH";
  if (ledgerXp < derivedXp) status = "LEDGER_BELOW_DERIVED";
  else if (ledgerXp > derivedXp) status = "LEDGER_ABOVE_DERIVED";

  return { email: userEmail, derivedXp, ledgerXp, status, diff: ledgerXp - derivedXp };
}

// ── Legacy baseline migration: preview ─────────────────────
// For each user: derivedXp = computeTotalXp(stats), ledgerXp = SUM(XpEvent).
// If derivedXp > ledgerXp: baselineNeeded = derivedXp - ledgerXp.
// Does NOT write — just reports.
export async function previewLegacyBaseline() {
  const users = await base44.entities.User.list("-created_date", 500);
  const allEntries = await base44.entities.AnimeEntry.list("-updated_date", 5000);
  const allPosts = await base44.entities.Post.list("-created_date", 2000);
  const allEvents = await base44.entities.XpEvent.list("-event_date", 10000);

  const results = [];
  for (const user of users) {
    const myEntries = allEntries.filter((e) => e.created_by === user.email);
    const myPosts = allPosts.filter((p) => p.created_by === user.email);
    const stats = computeStats(myEntries, myPosts);
    const derivedXp = computeTotalXp(stats);
    const userEvents = allEvents.filter((ev) => ev.user_email === user.email);
    const ledgerXp = getTotalXpFromEvents(userEvents);
    const alreadyMigrated = userEvents.some(
      (ev) => ev.idempotency_key === `legacy-xp-baseline-v1:${user.email}`
    );
    const baselineNeeded = Math.max(0, derivedXp - ledgerXp);
    results.push({
      email: user.email,
      derivedXp,
      ledgerXp,
      baselineNeeded,
      alreadyMigrated,
    });
  }
  return results;
}

// ── Legacy baseline migration: execute ─────────────────────
// Creates one legacy_migration event per user with the difference.
// Idempotency: legacy-xp-baseline-v1:{user_email} (one-time per user).
export async function executeLegacyBaseline() {
  const preview = await previewLegacyBaseline();
  const results = [];
  for (const user of preview) {
    if (user.baselineNeeded > 0 && !user.alreadyMigrated) {
      const r = await grantXpEvent({
        userEmail: user.email,
        eventType: "legacy_migration",
        idempotencyKey: `legacy-xp-baseline-v1:${user.email}`,
        xpAmount: user.baselineNeeded,
      });
      results.push({
        email: user.email,
        baselineNeeded: user.baselineNeeded,
        ...r,
      });
    } else {
      results.push({
        email: user.email,
        baselineNeeded: 0,
        status: user.alreadyMigrated ? "ALREADY_MIGRATED" : "NO_BASELINE_NEEDED",
      });
    }
  }
  return results;
}