# Supabase Friends UI parity

Implemented for review; no commit or push.

## File inventory

- Modified `src/components/supabase/FriendsPage.jsx`: centered legacy layout, connection count, local search, Amigos/Solicitações tabs, received-request badge, empty/error/loading states, URL tab selection and authoritative refresh after mutations.
- Created `src/components/supabase/friends/SupabaseFriendCard.jsx`: shared compact accepted/received/sent presentation, signed avatars, UUID profile links, message link, dropdown menu and accept/reject/cancel/remove controls. One component shares the same identity/media presentation across the three states.
- Created `tests/supabase-friends-ui.test.jsx`: nine tests using the real friendship service against a synthetic client.
- Created this report.

## Restored UI and preserved behavior

Restores the original max-width page, Zoku fonts/colors, secondary search field, tab styling, request badge, compact rounded cards, avatar/name/username hierarchy, hover treatment and received/sent sections. Mobile request actions wrap below the identity; long names truncate. Shell gutters supply the page's horizontal spacing.

Existing friendship service methods perform every mutation. Lists are re-read after success; no optimistic friendship state is invented. Concurrent actions are disabled. A mutation error retains the last loaded rows; a failed refresh hides stale rows and offers a read-only retry. Late reads are discarded after unmount or identity changes. Existing route identity boundaries remain intact.

Profile navigation remains `/u/<UUID>`. Avatars reuse `useProfileMedia` and `ProfileImage`, including short-lived signing, crop styles and fallbacks. Missing public-view profiles show a neutral unavailable label. No private path is rendered as an image URL. Message actions navigate to the existing `/messages` page; selecting a recipient through the URL is not currently supported there.

No backend/service/schema/RPC/RLS/auth/storage/messaging changes. Legacy files remain intact. No email relational identity or direct profile-table queries were introduced.

## Search and intentional differences

The current service has `list` and UUID-scoped `profilesByIds`, but no broad discovery/search API. Search therefore filters only loaded accepted friends and incoming/outgoing requests, by display name or username, starting at two characters. The UI explains this limitation and makes no extra queries. Unknown users and an Add action are not fabricated.

Presence, activity, watch-together, notifications, recommendations, ranking/XP and floating chat remain omitted. Request actions use a second row on narrow screens. Search helper text and unavailable-profile fallbacks are intentional differences from the legacy screen.

## Validation

- Nine Friends UI tests pass: counts, UUID links, signed media, scoped profile retrieval, local search, all four mutation RPCs, authoritative reload, mutation failure, refresh failure/retry, empty states, unavailable profiles, concurrent-action locking and remount with the requests tab.
- Existing auth service tests: 17/17 pass. Profile service tests: 14/14 pass.
- Full UI suite before the final added concurrency/remount test: 67/68 pass, including all 25 profile/shell tests. The sole existing failure remains missing Supabase configuration: the unchanged auth provider constructs `friendService` with a null client and throws `SUPABASE_CLIENT_REQUIRED` before rendering routes. The final Friends suite separately passes 9/9.
- Supabase-enabled production build and targeted ESLint pass. `git diff --check` passes.
- Repository-wide lint reports 49 existing errors (down from 50 after fixing the Friends load-effect dependency). Typecheck still reports 866 diagnostics; none name the changed Friends components.
- Friends import graph checked for Base44 references. No direct queries or email identity were added to the Friends components.
- Local browser checks with synthetic data and the real auth store/service: desktop layout at 1440px, received/sent requests at 390px, accepted cards at 320px, long-name truncation and no horizontal page overflow. Accepting a request visibly updates the connection count and removes the received badge.

Live Supabase credentials, persisted production data and production RLS were not exercised. Those remain owned by the unchanged backend. Temporary preview fixtures were removed.

## Follow-ups

Review before committing. Broad user discovery requires a separately scoped backend capability. Fix the pre-existing missing-configuration auth failure and repository lint/typecheck backlog separately.
