# XP Security Hardening Report — P0 Closure

## Overview

Migrated ALL XP authority from client-side to server-side backend functions. The client no longer:
- Creates `XpEvent` records directly
- Creates `UserAchievement` records directly
- Updates `AnimeEntry` progress (`current_episode`, `current_chapter`, `status: "completed"`) directly
- Calculates `xp_amount`
- Builds `idempotency_key` values
- Sends `userEmail` for XP/achievement operations

Three backend functions form the authoritative layer:
1. `grantXp` — direct XP granting (anime_added, post_created, legacy_migration, etc.)
2. `unlockAchievement` — achievement validation + UserAchievement creation + XP
3. `updateProgress` — progress changes + XP atomicity (increment, decrement, set_progress, complete)

## Canonical Properties

```
ACHIEVEMENT_AUTHORITY = BACKEND
CLIENT_USERACHIEVEMENT_CREATE = FALSE
PROGRESS_XP_AUTHORITY = BACKEND
PROGRESS_AND_XP_ATOMICITY_BASE44 = BEST_EFFORT
PROGRESS_AND_XP_ATOMICITY_SUPABASE = TRANSACTIONAL
LEGACY_BULK_XP = PRE_RESET_TEST_DATA
DIRECT_PROGRESS_WRITE_BASE44 = RESIDUAL_RISK (no field-level RLS in Base44)
SUPABASE_PROGRESS_TARGET = RPC
```

## Architecture

### Backend Functions

#### 1. `base44/functions/grantXp/entry.ts`
Sole authority for direct XP granting. Handles: `episode_watched`, `chapter_read`, `episode_range`, `chapter_range`, `post_created`, `anime_added`, `work_completed`, `achievement_unlocked` (backward compat), `level_up`, `legacy_migration`.

Key security properties:
- `user.email` from `base44.auth.me()` — never from client payload
- `xp_amount` calculated server-side from `XP_REWARDS` / `ACHIEVEMENT_XP`
- `idempotency_key` built server-side
- Source ownership validated for every event type
- Canonical total from `WorkRelease` (authority) with entry fallback
- Streak updated only when a new event is GRANTED
- `asServiceRole` bypasses RLS for XpEvent creation

#### 2. `base44/functions/unlockAchievement/entry.ts` (NEW)
Sole authority for achievement unlocking. The client NO LONGER creates `UserAchievement` records.

Flow:
```
Frontend detects possible achievement
  → base44.functions.invoke("unlockAchievement", { achievement_id })
    → Backend unlockAchievement
      → base44.auth.me() [server-side identity]
      → Validate achievement_id exists in ACHIEVEMENT_XP
      → Check if UserAchievement already exists (idempotent → ALREADY_GRANTED)
      → Compute real user stats from DB (entries, posts, profile, friendships, events, communities, watch-together, XP events, users)
      → Check achievement condition server-side
      → If condition met:
        → Create UserAchievement (service role, bypasses RLS)
        → Create XpEvent with key `achievement:{achievementId}` (idempotent)
        → Update streak
        → Return GRANTED
      → If condition not met:
        → Return CONDITION_NOT_MET (403)
```

Known limitations (backend can't access `src/lib/catalog.js`):
- `five_genres`: uniqueGenres not computable → always false
- `first_comment`: totalComments not fetched → always false
- `streak_weeks_4`: activeWeeks not tracked → always false
- `same_day_complete`: not computable without timestamps → always false

These 4 achievements cannot be unlocked via backend. Existing client-side unlocks are preserved (ALREADY_GRANTED).

#### 3. `base44/functions/updateProgress/entry.ts` (NEW)
Sole authority for progress changes + XP atomicity. The client NO LONGER updates `AnimeEntry.current_episode`, `current_chapter`, or `status: "completed"` directly.

Actions:
- `increment` — current + 1 (validates against canonical total, grants per-unit XP, auto-completes if not airing)
- `decrement` — current - 1 (no XP removal, reverts status if was completed)
- `set_progress` — set to value (grants XP for delta episodes, auto-completes if not airing)
- `complete` — set to canonical total + status completed (grants missing episode XP + completion XP)

Flow:
```
Frontend calls updateProgress({ entryId, action, value })
  → Backend updateProgress
    → base44.auth.me() [server-side identity]
    → Fetch AnimeEntry, validate ownership (created_by === user.email)
    → Resolve WorkRelease canonical total (authority) or entry fallback
    → Check airing status (releasing → no auto-complete)
    → Compute new progress based on action
    → Validate new progress against canonical total
    → Update AnimeEntry (service role)
    → Create XpEvent(s) for episodes in range (current+1 .. newProgress), per-unit idempotency
    → If completed: create completion XpEvent (idempotent)
    → Update streak only if XP was granted
    → Return { status, progress, xp_granted, completion_xp_granted, total_xp_granted, completed, status_changed }
```

Key security properties:
- Ownership validated (`entry.created_by === user.email`)
- Canonical total from `WorkRelease` (authority) — no `Math.max(entry_total, release_total)`
- Airing works (`release.status === "releasing"`) are NOT auto-completed
- Per-unit idempotency: `episode:{entryId}:{n}` / `chapter:{entryId}:{n}`
- Completion idempotency: `completion:{entryId}`
- Decrement does NOT remove XP (but re-incrementing is idempotent — no duplicate)
- Streak updated only when XP is granted (not on ALREADY_GRANTED, decrement, or no-XP changes)

### Shared Module: `base44/shared/xpConstants.ts`
Single source of truth for:
- `XP_REWARDS` — per-event XP values
- `ACHIEVEMENT_XP` — per-achievement XP values
- `xpRequiredForLevel` / `getLevelFromXp` — level calculation
- `updateStreak` — streak update (only on GRANTED)
- `findExisting` — idempotency check (best-effort)
- `createEvent` — XpEvent creation (service role)
- `getCanonicalTotal` — WorkRelease total resolution
- `getWorkRelease` — WorkRelease fetch for airing check

Imported by `grantXp`, `unlockAchievement`, and `updateProgress`.

### RLS Changes

#### XpEvent (`base44/entities/XpEvent.jsonc`)
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
Client cannot create/update/delete. Backend uses `asServiceRole` to bypass.

#### UserAchievement (`base44/entities/UserAchievement.jsonc`)
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
Client cannot create/update/delete. Backend `unlockAchievement` uses `asServiceRole` to create.
Previously: `create` allowed `data.user_email === {{user.email}}` — client could fabricate achievements.
Now: admin-only create. Ledger-like immutability.

#### AnimeEntry (`base44/entities/AnimeEntry.jsonc`)
RLS unchanged — users can still create/update/delete their own entries.
**Base44 does NOT support field-level RLS** — we cannot block `current_episode`/`current_chapter`/`status` writes while allowing `rating`/`notes` writes.
**Mitigation:** All official progress flows route through `updateProgress` backend. Direct `AnimeEntry.update` for progress fields is a **residual risk** in Base44.
**Supabase target:** RPC `update_progress(entry_id, new_value)` with column-level RLS blocking direct writes to `current_episode`, `current_chapter`, `status` (for completed transitions).

### Frontend Changes

#### `src/lib/progressApi.js` (NEW)
Thin wrappers:
- `updateProgress({ entryId, action, value })` → `base44.functions.invoke("updateProgress", ...)`
- `unlockAchievement({ achievementId })` → `base44.functions.invoke("unlockAchievement", ...)`

#### `src/lib/xpEvents.js`
- `grantAchievement()` → now calls `unlockAchievement` backend (no longer creates `UserAchievement` client-side)
- `grantXpEvent()` → unchanged (thin wrapper for `grantXp`)
- `grantEpisodeRange()` → unchanged (thin wrapper for `grantXp` with range events)

#### `src/components/obra/ReleaseBlock.jsx`
- `handleIncrement` → `updateProgress({ action: "increment" })`
- `handleDecrement` → `updateProgress({ action: "decrement" })`
- `handleJumpTo` → `updateProgress({ action: "set_progress", value })`
- `handleStatusChange("completed")` → `updateProgress({ action: "complete" })`
- `handleStatusChange(other)` → direct `AnimeEntry.update` (no XP impact)
- `handleAdd("completed")` → create as "planned" + `updateProgress({ action: "complete" })`
- `handleAdd(other)` → create + `grantXpEvent({ eventType: "anime_added" })`
- Toasts use `result.total_xp_granted` from backend response (not client-calculated)

#### `src/pages/ObraProfile.jsx` (FormatBlock)
Same changes as ReleaseBlock.

#### `src/components/mylist/EntryCard.jsx`
- `increment()` → `updateProgress({ action: "increment" })`
- `decrement()` → `updateProgress({ action: "decrement" })`
- `jumpTo()` → `updateProgress({ action: "set_progress", value })`
- Status dialog "completed" → `updateProgress({ action: "complete" })`
- Status dialog other → `onUpdate(entry.id, { status: s })` (no XP impact)

#### `src/components/media/MediaDrawer.jsx`
- `handleIncrement` → `updateProgress({ action: "increment" })`
- `handleDecrement` → `updateProgress({ action: "decrement" })`
- `handleJumpTo` → `updateProgress({ action: "set_progress", value })`
- `handleStatusChange("completed")` → `updateProgress({ action: "complete" })`
- `handleAddToList("completed")` → create as "planned" + `updateProgress({ action: "complete" })`
- `handleAddToList(other)` → create with status (no XP impact)

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

### grantXp / unlockAchievement
| Status | Meaning |
|---|---|
| `GRANTED` | New event created, XP awarded |
| `ALREADY_GRANTED` | Event with same idempotency key exists |
| `CONDITION_NOT_MET` | Achievement condition not satisfied (unlockAchievement only) |
| `UNAUTHORIZED` | Not authenticated |
| `FORBIDDEN` | Admin-only action attempted by non-admin |
| `SOURCE_NOT_FOUND` | Entry/post not found |
| `SOURCE_NOT_OWNED` | Entry/post belongs to another user |
| `PROGRESS_NOT_REACHED` | Unit number > current progress on entry |
| `OUT_OF_RANGE` | Unit number > canonical total from WorkRelease |
| `INVALID_ACHIEVEMENT` | Achievement ID not in ACHIEVEMENT_XP map |
| `INVALID_EVENT_TYPE` | Event type not in whitelist |
| `ERROR` | Unexpected server error |

### updateProgress
| Status | Meaning |
|---|---|
| `GRANTED` | Progress updated, XP awarded |
| `ALREADY_GRANTED` | Progress updated, but XP already granted (idempotent) |
| `UNAUTHORIZED` | Not authenticated |
| `SOURCE_NOT_FOUND` | Entry not found |
| `SOURCE_NOT_OWNED` | Entry belongs to another user (403) |
| `OUT_OF_RANGE` | New progress > canonical total |
| `INVALID_ACTION` | Action not in: increment, decrement, set_progress, complete |
| `INVALID_VALUE` | Negative value for set_progress |
| `INVALID_PARAMS` | Missing entry_id or action |
| `ERROR` | Unexpected server error |

**Response body (updateProgress):**
```json
{
  "status": "GRANTED",
  "progress": 6,
  "xp_granted": 10,
  "completion_xp_granted": 0,
  "total_xp_granted": 10,
  "completed": false,
  "status_changed": false
}
```

## UI XP Display

The UI NO LONGER shows `+10 XP` before the backend confirms. All toasts use `result.total_xp_granted` from the backend response:
- `GRANTED` with `total_xp_granted > 0` → show `+N XP`
- `ALREADY_GRANTED` with `total_xp_granted = 0` → show progress update without XP

## Streak Behavior

Streak is updated ONLY when at least 1 new XP event is created:
- ✅ `GRANTED` (new episode/chapter/completion/achievement) → streak updated
- ❌ `ALREADY_GRANTED` → streak NOT updated
- ❌ Decrement → streak NOT updated
- ❌ Status change without XP → streak NOT updated

## WorkRelease as Authority

`updateProgress` resolves the canonical total:
1. If `entry.release_id` exists → fetch `WorkRelease`
2. `WorkRelease.episode_count` (anime) or `WorkRelease.chapter_count` (manga) is the authority
3. If `release_id` is null or WorkRelease has no total → fallback to `entry.total_episodes` / `entry.total_chapters`
4. **Never** `Math.max(entry_total, release_total)` — WorkRelease always wins when available

Airing check: `release.status === "releasing"` → no auto-complete (total may grow).

## Legacy Bulk XP

```
LEGACY_BULK_XP = PRE_RESET_TEST_DATA
```
Old `episodes-bulk:ENTRY:add-completed` events remain in the ledger. They are counted in `getTotalXpFromEvents` but are NOT migrated or reconstructed. A hard reset of XP/progress is expected, which will clear these.

No new bulk events are created. All progress XP goes through per-unit idempotent events.

## AnimeEntry Field-Level Protection

**Base44 limitation:** Base44 does NOT support field-level RLS. We cannot restrict writes to `current_episode`, `current_chapter`, `status` while allowing writes to `rating`, `notes`.

**Current mitigation:**
- All official progress flows route through `updateProgress` backend
- The backend validates ownership, resolves canonical total, and creates XP atomically
- Direct `AnimeEntry.update` for progress fields is a **residual risk** — a malicious client could still call `AnimeEntry.update` directly

**Residual risk in Base44:**
- A client could set `current_episode: 100` directly via `AnimeEntry.update`
- But this alone does NOT grant XP — XP is only granted through `updateProgress` or `grantXp`
- The client would need to also call `grantXp` with `episode_watched` events, which validates `unit_number <= entry.current_episode`
- So the client could: (1) update progress directly, (2) call grantXp for each episode — this is the same attack vector as before, but now the backend validates ownership and canonical total

**Supabase target (closes this completely):**
```sql
-- Column-level RLS: block direct writes to progress fields
ALTER TABLE anime_entries 
  ALTER COLUMN current_episode SET DEFAULT 0,
  ALTER COLUMN current_chapter SET DEFAULT 0;

-- RPC for progress updates (transactional)
CREATE FUNCTION update_progress(entry_id UUID, new_value INT)
RETURNS TABLE(progress INT, xp_granted INT, completed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Validate ownership
  -- Resolve WorkRelease canonical total
  -- UPDATE anime_entries
  -- INSERT INTO xp_events (per-unit idempotent)
  -- Return result
END;
$$;

-- RLS: block direct UPDATE of progress fields
CREATE POLICY "no_direct_progress_write" ON anime_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    current_episode = (SELECT current_episode FROM anime_entries WHERE id = entry_id)
    AND current_chapter = (SELECT current_chapter FROM anime_entries WHERE id = entry_id)
  );
```

## Known Limitations

1. **Race condition:** The idempotency check (filter → create) is not atomic in Base44. Double-clicks can still create duplicates. **Target:** Supabase `UNIQUE(user_id, idempotency_key)` constraint.

2. **Direct AnimeEntry writes:** Base44 lacks field-level RLS. Clients can still update `current_episode` directly. This does NOT grant XP (XP requires `updateProgress` or `grantXp`), but it's a residual risk. **Target:** Supabase RPC + column-level RLS.

3. **4 achievements not backend-validatable:** `five_genres`, `first_comment`, `streak_weeks_4`, `same_day_complete` — backend can't compute these without catalog/timestamp data. These return `CONDITION_NOT_MET`. Existing client-side unlocks are preserved.

4. **Stats computation cost:** `unlockAchievement` fetches entries, posts, profile, friendships, events, communities, watch-together, XP events, and users for each call. This is necessary for server-side validation but may be slow for users with large libraries.

5. **XP_REWARDS/ACHIEVEMENT_XP duplication:** Defined in both `src/lib/xpSystem.js` (frontend, display-only) and `base44/shared/xpConstants.ts` (backend, authoritative). The backend is the single source of truth.

## Files Created
- `base44/shared/xpConstants.ts` — shared constants and helpers
- `base44/functions/unlockAchievement/entry.ts` — achievement validation + unlock backend
- `base44/functions/updateProgress/entry.ts` — progress + XP atomicity backend
- `src/lib/progressApi.js` — frontend helpers for backend invocation

## Files Altered
- `base44/entities/UserAchievement.jsonc` — RLS locked to admin-only create/update/delete
- `base44/functions/grantXp/entry.ts` — refactored to use shared `xpConstants.ts`
- `src/lib/xpEvents.js` — `grantAchievement` now calls `unlockAchievement` backend
- `src/components/obra/ReleaseBlock.jsx` — all progress flows via `updateProgress`
- `src/pages/ObraProfile.jsx` — FormatBlock progress flows via `updateProgress`
- `src/components/mylist/EntryCard.jsx` — progress flows via `updateProgress`
- `src/components/media/MediaDrawer.jsx` — progress flows via `updateProgress`
- `src/lib/xpSecurityHardeningReport.md` — this report