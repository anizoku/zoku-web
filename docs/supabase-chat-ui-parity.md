# Supabase chat UI parity

Implemented for review on 2026-09-21. No commit or push. The existing uncommitted Friends UI work was preserved.

## Files created

- `src/components/supabase/chat/SupabaseChatProvider.jsx`: shared inbox, accepted recipients, scoped profiles, conversation loading, sends, receipts and account-scoped Realtime lifecycle.
- `src/components/supabase/chat/SupabaseChatPanel.jsx`: shared conversation rows, safe avatars, headers, message bubbles, composer and loading/error/empty states.
- `src/components/supabase/chat/SupabaseChatOverlay.jsx`: desktop floating button/window and mobile modal bottom sheet.
- `tests/supabase-chat-ui.test.jsx`: 13 UI tests covering all chat surfaces and asynchronous behavior.
- `tests/supabase-chat.test.js`: four tests for the unchanged message service's query and validation contracts.
- This report.

## Files modified

- `src/components/supabase/DirectMessagesPage.jsx`: keeps `/messages` working using the shared chat presentation and state.
- `src/components/supabase/layout/SupabaseAppLayout.jsx`: mounts the shared provider and overlay inside the existing identity-keyed shell.
- `src/components/supabase/layout/SupabaseMobileNav.jsx`: replaces the Chat route link with the drawer button and unread badge; other navigation remains unchanged.
- `tests/supabase-profile-ui.test.jsx`: updates the mobile navigation expectation and supplies scoped inbox/Realtime fixtures for the new shell integration. Keeps anonymous profile security assertions.

## Restored legacy presentation

Desktop uses the bottom-right 48px circular primary button, conversation badge, 320px popup, rounded corners, border/shadow, compact friend rows, signed avatars, usernames, latest-message previews and `Você: ` prefixes. The list fits its contents up to the height limit; active conversations use a 400px window. Back, minimize, restore and close work. Minimize preserves the selected conversation; close returns to the list.

Mobile Chat opens a bottom sheet above the existing bottom navigation. The list fits its contents, with a 75dvh maximum; active conversations use 65dvh. The modal supports focus containment, Escape, backdrop dismissal and an explicit close button. Long names truncate and long unbroken messages wrap.

Sent bubbles align right with primary colors and a small top-right corner; received bubbles align left with secondary colors and a small top-left corner. Times appear below bubbles, using `created_at`. Sent messages retain `Enviada`/`Lida` from `read_at`. The message pane scrolls to new messages without scrolling the background page.

`/messages` remains a standalone route. It now uses the same list-to-conversation presentation instead of the former two-column administrative layout. Its desktop floating overlay is suppressed to avoid showing two panels. Entering the route refreshes recipients after changes elsewhere in the persistent shell.

## Preserved service and security boundaries

All message operations use the unchanged `directMessageService`: `inbox`, `conversation`, `send`, `markRead`, and `markConversationRead`. Accepted recipients and UUID-scoped profiles come from the unchanged friendship service. Pending relationships and the current user's own UUID are excluded from the recipient UI. Send validation remains enforced by the service and backend; denied sends retain the draft and show an error.

The composer supports Enter and the send button, trims whitespace, rejects blank or over-3000-character input and disables concurrent sends. A successful send followed by a failed refresh clears the draft and reports that the message was sent, preventing an accidental retry of the same message.

Profile links use `/u/<UUID>`. Avatars reuse `useProfileMedia` and `ProfileImage`, including short-lived signing, crop styles and unavailable/error fallbacks. No raw private paths are used as image sources. No Base44 imports, email identity, unrestricted profile queries, SQL, backend/service changes, auth changes or storage-policy changes were introduced. Legacy chat components remain untouched.

## Realtime and unread behavior

One account-scoped Supabase channel listens for INSERT and UPDATE on `public.direct_messages`, using the existing API pattern. The shared provider keeps it alive across conversation switches so closed/minimized chat previews can update. The channel is removed on shell/account-boundary unmount; service-object rerenders do not resubscribe. RLS remains the security boundary, and the client additionally ignores events involving neither participant UUID of the signed-in account.

Messages merge by UUID, preventing duplicates when a send response and INSERT echo arrive together. A known non-null receipt is retained if an older response arrives after its UPDATE. Active-conversation reads are canceled logically when the selection changes, preventing stale responses from replacing a new conversation. Reconnects reconcile through the existing services. Channel failures appear inside chat rather than breaking the shell.

Per-row unread counts are received messages with a null `read_at`. The floating/mobile badge counts accepted-friend conversations with at least one unread message, matching the legacy distinction between conversations and messages. Opening/restoring a visible conversation marks it read; incoming active messages use `markRead`. Closed, minimized and document-hidden conversations are not marked read by incoming-event handling.

## Validation

- Chat UI tests: **13/13 passed**. Covers desktop/mobile/page, safe avatars and UUID links, previews/counts, accepted-only recipients, sending and constraints, failed drafts, concurrency, INSERT/UPDATE deduplication, live receipts, minimize/restore/back/close, reconnect, load failure/retry, profile/history fallbacks, stale reads, unmount cleanup and refreshing recipients on route entry.
- Service tests: **35/35 passed**: 17 auth, 14 profile, four messaging.
- Full UI suite before the final added route-entry test: **80/81 passed**. The sole failure remains the pre-existing missing-configuration auth test: the unchanged auth provider constructs `friendService` with a null client and throws `SUPABASE_CLIENT_REQUIRED` before routing. The final chat suite separately passes all 13 tests.
- Production build with `VITE_ENABLE_SUPABASE_AUTH=true`: passed after the final source change.
- Targeted ESLint on all changed chat/shell/test files: passed. `git diff --check`: passed.
- Repository typecheck still reports **866 existing diagnostics**; none name the changed chat components or shell files.
- Chat import graph: **16 local files**, no Base44 imports. No direct table queries or email identity in chat components.
- Browser checks used synthetic local data with the real auth store and services: desktop list and active conversation, sending, incoming events, live `Lida`, minimized unread badge; mobile list, conversation, sending and long-word wrapping. At 390px, page client/scroll widths were 390/390 and drawer widths 388/388; at 320px, page widths were 320/320 and drawer widths 318/318.

Temporary browser fixtures, configuration and preview server were removed/stopped. No production messages were sent. Live two-account Supabase delivery, production RLS and device soft-keyboard behavior were not exercised.

## Intentional differences and follow-ups

No presence, typing indicators, groups, attachments, editing/deletion, reactions, push notifications, broad user search, watch-together or notification backend was migrated. There is no invented delivery state. Friend-card links still open `/messages`; recipient deep-link selection was not added.

The mobile sheet uses the existing accessible dialog primitive rather than the legacy untrapped overlay. Desktop/mobile share a single selected conversation. Unsent drafts are local to the mounted conversation view and are not persisted across closing/minimizing/switching surfaces. History loading retains the existing service's unpaginated behavior; very large inboxes may need a separately scoped pagination change. Revoked friendships are refreshed on chat open, reconnect and standalone-route entry, while the backend remains authoritative for every send.

Review these changes before committing. Separately address the pre-existing missing-configuration auth failure and repository typecheck backlog. A live two-account smoke test is the remaining deployment-level verification.
