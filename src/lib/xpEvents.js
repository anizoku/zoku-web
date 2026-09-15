// ============================================================
// XP EVENT LEDGER — Thin client for backend grantXp
// ============================================================
// All XP granting goes through the backend function grantXp.
// This module is a thin wrapper that invokes the backend and
// normalizes the response. The client NEVER:
//   - Creates XpEvent directly
//   - Defines xp_amount
//   - Builds idempotency_key
//   - Sends userEmail (backend uses auth.me())
//
// Read-only helpers (getTotalXpFromEvents, getPeriodXpFromEvents,
// checkXpConsistency, previewLegacyBaseline) remain client-side
// since they only READ the ledger.
// ============================================================

import { base44 } from "@/api/base44Client";
import { computeStats, computeTotalXp } from "./xpSystem";

// ── Core: grantXpEvent (thin client → backend grantXp) ──────
// Returns { status: "GRANTED" | "ALREADY_GRANTED" | "SOURCE_NOT_OWNED" | ... , xpAmount }
//
// Accepted params:
//   eventType, sourceType, sourceId, achievementId, unitNumber
// Ignored (backward compat): userEmail, idempotencyKey, workType, count, xpAmount
export async function grantXpEvent({
  eventType,
  sourceType,
  sourceId,
  achievementId,
  unitNumber,
  // eslint-disable-next-line no-unused-vars
  userEmail, idempotencyKey, workType, count, xpAmount,
}) {
  const finalSourceId = sourceId || achievementId;
  if (!eventType || !finalSourceId) {
    return { status: "INVALID", xpAmount: 0 };
  }
  try {
    const response = await base44.functions.invoke("grantXp", {
      event_type: eventType,
      source_type: sourceType,
      source_id: finalSourceId,
      unit_number: unitNumber,
    });
    const result = response.data || response;
    return {
      status: result.status,
      xpAmount: result.xp_amount || 0,
      idempotencyKey: result.idempotency_key,
    };
  } catch (e) {
    return { status: "ERROR", xpAmount: 0, error: e };
  }
}

// ── Grant XP for an episode/chapter range (jump 5→8 = 6,7,8) ──
// Backend creates individual events for from+1..to with per-unit idempotency.
export async function grantEpisodeRange({ entryId, fromNum, toNum, eventType }) {
  const rangeType = eventType === "chapter_read" ? "chapter_range" : "episode_range";
  try {
    const response = await base44.functions.invoke("grantXp", {
      event_type: rangeType,
      source_type: "anime_entry",
      source_id: entryId,
      from: fromNum,
      to: toNum,
    });
    return response.data || response;
  } catch (e) {
    return { status: "ERROR", error: e };
  }
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

// ── Idempotent achievement unlock + XP ──────────────────────
// Backend validates condition server-side, creates UserAchievement,
// and grants XP. Client NO LONGER creates UserAchievement — RLS
// blocks client create/update/delete (admin-only).
// userEmail is accepted for backward compat but ignored (backend uses auth.me()).
export async function grantAchievement({ userEmail, achievementId }) {
  if (!achievementId) return { status: "INVALID" };
  try {
    const response = await base44.functions.invoke("unlockAchievement", {
      achievement_id: achievementId,
    });
    const result = response.data || response;
    return { status: result.status, xpAmount: result.xp_amount || 0 };
  } catch (e) {
    return { status: "ERROR", error: e };
  }
}

// ── Consistency check: derived vs ledger (read-only) ───────
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

// ── Legacy baseline migration: preview (read-only, admin) ─────
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

// ── Legacy baseline migration: execute (DISABLED) ─────────────
// This function is disabled for security. Legacy baseline migration
// must be performed via the backend grantXp function with
// event_type=legacy_migration (admin-only). The backend validates
// admin role and handles idempotency server-side.
export async function executeLegacyBaseline() {
  throw new Error(
    "executeLegacyBaseline is disabled. Use the backend grantXp function with event_type=legacy_migration (admin-only)."
  );
}