# XP Security Hardening Report

## Overview

Migrated XP granting authority from client-side to a server-side backend function (`grantXp`). The client no longer creates `XpEvent` records directly, calculates `xp_amount`, or builds `idempotency_key` values. All XP granting flows through a single authoritative backend endpoint.

## Architecture

### Before (INSECURE)

```
Client (ReleaseBlock/ObraProfile/CreatePostCard)
  → xpEvents.js grantXpEvent()
    → resolveXpAmount() on client
    → base44.entities.XpEvent.create({ xp_amount, idempotency_key, ... })
```

**Vulnerabilities:**
- Any authenticated user could create arbitrary `XpEvent` records
- `xp_amount` was calculated client-side and sent to the DB
- `idempotency_key` was built client-side (could be spoofed)
- `userEmail` was passed from the client (could be spoofed to grant XP to others)
- Bulk XP events (`episodes-bulk:ENTRY:add-completed`) bypassed per-unit idempotency
- No source ownership validation (user could grant XP for another user's entry/post)
- No episode progress validation against actual entry data
- No canonical total validation against WorkRelease
- `executeLegacyBaseline()` was callable from the frontend

### After (HARDENED)

```
Client (ReleaseBlock/ObraProfile/CreatePostCard)
  → xpEvents.js grantXpEvent() [thin wrapper]
    → base44.functions.invoke("grantXp", { event_type, source_type, source_id, unit_number })
      → Backend grantXp
        → base44.auth.me() [server-side identity]
        → Validate event_type whitelist
        → Validate source ownership (entry.created_by === user.email)
        → Validate progress reached (unit_number <= entry.current_episode)
        → Validate canonical total (WorkRelease.episode_count)
        → Calculate xp_amount server-side
        → Build idempotency_key server-side
        → Check idempotency (best-effort)
        → base44.asServiceRole.entities.XpEvent.create() [bypasses RLS]
        → updateStreak() only on GRANTED
```

## Changes

### 1. Backend Function: `base44/functions/grantXp/entry.ts`

**Sole authority for all XP granting.** Handles:

| Event Type | Validation | XP Source |
|---|---|---|
| `episode_watched` | Entry ownership, progress reached, canonical total | `XP_REWARDS.episode_watched` (10) |
| `chapter_read` | Entry ownership, progress reached, canonical total | `XP_REWARDS.chapter_read` (7) |
| `episode_range` | Entry ownership, range valid, progress reached, canonical total | Per-unit (10 each) |
| `chapter_range` | Entry ownership, range valid, progress reached, canonical total | Per-unit (7 each) |
| `work_completed` | Entry ownership, status === "completed" | `anime_completed` (150) or `manga_completed` (100) |
| `anime_added` | Entry ownership | `anime_added` (15) |
| `post_created` | Post ownership | `post_created` (20) |
| `achievement_unlocked` | UserAchievement exists, achievement ID valid | `ACHIEVEMENT_XP[id]` |
| `level_up` | Authenticated | 0 |
| `legacy_migration` | Admin only | Client-specified (admin) |

**Key security properties:**
- `user.email` from `base44.auth.me()` — never from client payload
- `xp_amount` calculated server-side — client never sends it
- `idempotency_key` built server-side — client never sends it
- `event_date` set server-side — client never sends it
- Source ownership validated for every event type
- Canonical total from `WorkRelease` (authority) with entry fallback
- Streak updated only when a new event is GRANTED (not ALREADY_GRANTED)
- `asServiceRole` bypasses RLS for XpEvent creation

### 2. XpEvent RLS: `base44/entities/XpEvent.jsonc`

```json
{
  "rls": {
    "create": { "user_condition": { "role": "admin" } },
    "read": {},
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}
```

- **Create/Update/Delete:** Admin only (for manual corrections). Regular users cannot write.
- **Read:** Open to authenticated users (for ranking/profile display).
- **Service role:** Bypasses RLS — the backend function uses `asServiceRole` to create events.
- **Immutability:** Ledger records should never be edited or deleted. Admin access exists only for emergency corrections.

### 3. Frontend Wrapper: `src/lib/xpEvents.js`

Refactored to a thin client:
- `grantXpEvent()` → calls `base44.functions.invoke("grantXp", ...)`
- `grantEpisodeRange()` → calls backend with `episode_range` or `chapter_range`
- `grantAchievement()` → creates `UserAchievement` (frontend, RLS allows) then calls backend for XP
- `getTotalXpFromEvents()` / `getPeriodXpFromEvents()` → unchanged (read-only)
- `checkXpConsistency()` → unchanged (read-only)
- `previewLegacyBaseline()` → unchanged (read-only, admin)
- `executeLegacyBaseline()` → **DISABLED** — throws error, must use backend directly

**Removed from frontend:**
- `resolveXpAmount()` — backend handles XP calculation
- `updateStreak()` — backend handles streak update
- Direct `base44.entities.XpEvent.create()` calls

### 4. Bulk XP Elimination

**Before:** Adding an anime as "completed" created a single bulk event:
```
idempotency_key: "episodes-bulk:ENTRY_ID:add-completed"
xp_amount: totalEpisodes * 10
```

**After:** Adding an anime as "completed" creates individual per-episode events:
```
idempotency_key: "episode:ENTRY_ID:1"
idempotency_key: "episode:ENTRY_ID:2"
...
idempotency_key: "episode:ENTRY_ID:N"
```

This ensures per-unit idempotency — if the user had already watched episode 5, re-adding the anime won't grant duplicate XP for episodes 1-5.

**Files fixed:**
- `src/components/obra/ReleaseBlock.jsx` — replaced `count`-based bulk calls with `grantEpisodeRange()`
- `src/pages/ObraProfile.jsx` — same fix in `FormatBlock`

### 5. Client Parameter Cleanup

All `grantXpEvent()` calls in `ReleaseBlock.jsx` and `ObraProfile.jsx` were updated:
- Removed `userEmail` (backend uses `auth.me()`)
- Removed `idempotencyKey` (backend builds it)
- Removed `workType` (backend determines from entry type)
- Removed `count` (replaced by range calls)
- Added `unitNumber` for single episode/chapter events

## Idempotency Key Schemes (Server-Built)

| Event | Key Pattern |
|---|---|
| Episode watched | `episode:{entryId}:{unitNumber}` |
| Chapter read | `chapter:{entryId}:{unitNumber}` |
| Work completed | `completion:{entryId}` |
| Anime added | `entry:{entryId}:created` |
| Post created | `post:{postId}:create` |
| Achievement unlocked | `achievement:{achievementId}` |
| Level up | `levelup:{userEmail}:{level}` |
| Legacy migration | `legacy-xp-baseline-v1:{userEmail}` |

## Response Statuses

| Status | Meaning |
|---|---|
| `GRANTED` | New event created, XP awarded |
| `ALREADY_GRANTED` | Event with same idempotency key exists |
| `UNAUTHORIZED` | Not authenticated |
| `FORBIDDEN` | Admin-only action attempted by non-admin |
| `SOURCE_NOT_FOUND` | Entry/post not found |
| `SOURCE_NOT_OWNED` | Entry/post belongs to another user |
| `PROGRESS_NOT_REACHED` | Unit number > current progress on entry |
| `OUT_OF_RANGE` | Unit number > canonical total from WorkRelease |
| `NOT_COMPLETED` | Work completion requested but entry status != "completed" |
| `INVALID_EVENT_TYPE` | Event type not in whitelist |
| `INVALID_SOURCE` | Missing source_id |
| `INVALID_RANGE` | Invalid range (from >= to, negative, etc.) |
| `INVALID_UNIT` | Invalid unit number |
| `INVALID_ACHIEVEMENT` | Achievement ID not in ACHIEVEMENT_XP map |
| `ACHIEVEMENT_NOT_UNLOCKED` | No UserAchievement record for this user+achievement |
| `ERROR` | Unexpected server error |

## Known Limitations

1. **Race condition:** The idempotency check (filter → create) is not atomic in Base44. Double-clicks can still create duplicates. **Target:** Supabase `UNIQUE(user_id, idempotency_key)` constraint for atomic safety.

2. **XP_REWARDS duplication:** `XP_REWARDS` is defined in both `src/lib/xpSystem.js` (frontend, display-only) and `base44/functions/grantXp/entry.ts` (backend, authoritative). The backend is the single source of truth. The frontend copy exists only for UI preview ("+10 XP" labels).

3. **ACHIEVEMENT_XP duplication:** Same pattern — `src/lib/achievements.js` (frontend, display) and `base44/functions/grantXp/entry.ts` (backend, authoritative).

4. **WorkRelease lookup:** The backend fetches `WorkRelease` by `entry.release_id` to get the canonical total. If `release_id` is null, it falls back to `entry.total_episodes`/`entry.total_chapters`. Entries without `release_id` (legacy) may have less strict total validation.

5. **Streak update:** The streak is updated in the same request (not via `waitUntil`). If the `UserProfile` update fails, the XP event is still created. This is acceptable — streak is a secondary concern.

## Migration Notes

- **No data migration needed:** Existing `XpEvent` records are preserved. The `episodes-bulk` events from the old system remain in the ledger (they're still counted in `getTotalXpFromEvents`).
- **No RLS breaking change:** Existing reads continue to work. Only writes are restricted.
- **Backward compatibility:** The frontend `grantXpEvent()` accepts the old parameter names (`userEmail`, `idempotencyKey`, `workType`, `count`, `xpAmount`) but ignores them. This allows gradual migration of calling code.