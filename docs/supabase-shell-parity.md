# Supabase shell parity

Restored the legacy shell presentation over the existing Supabase route boundary. Authentication, profile/friend/message services, UUID identity, Realtime, database schema, RLS, migrations and page interiors are unchanged.

## Files

Created in `src/components/supabase/layout/`:

- `SupabaseAppLayout.jsx`: original flex layout, responsive content offset and breadcrumbs; shares the signed avatar between sidebar and top bar.
- `SupabaseSidebar.jsx`: original navigation order, styles, 224px/64px collapse and bottom profile card.
- `SupabaseTopBar.jsx`: original 56px sticky header and mobile branding positions; disabled search and notification controls.
- `SupabaseMobileNav.jsx`: original bottom navigation; Chat opens `/messages`.
- `SupabaseUserMenuButton.jsx`: original dropdown presentation using current Supabase profile and logout; includes a desktop Messages link.
- `SupabaseBrand.jsx`: explicitly documented text fallback for missing local logos.

Modified:

- `src/components/supabase/ProfileLayout.jsx`: retains the route boundary and exports the restored layout.
- `src/components/layout/Breadcrumbs.jsx`: adds the Mensagens label; otherwise reuses the pure legacy component directly.
- `tests/supabase-auth-ui.test.jsx`: exercises logout through the restored dropdown.
- `tests/supabase-profile-ui.test.jsx`: adds collapse, disabled controls, friends/placeholder routing, mobile inbox navigation and private shell-avatar cleanup coverage.

This report is also new. No legacy files were deleted or renamed.

## Reuse and intentional differences

Reuses Breadcrumbs, shadcn Input/Button/DropdownMenu, scrollMemory, the existing private `useProfileMedia`/`ProfileImage` helpers, CSS variables, Tailwind theme, Inter and Space Grotesk. Sidebar/top-bar/mobile/menu presentation is copied or adapted into Supabase-specific components.

No local PNG, SVG, JPEG, WebP or ICO logo assets were found. The old SiteConfig hook both queries Base44 and supplies media.base44.com fallback logos. The new shell uses text Z/Zoku in those positions until approved local brand assets are supplied.

Search and notifications remain disabled in their original positions. Rank, level and XP are explicitly unavailable, with an empty progress track; no activity entities or invented XP values are used. Admin is omitted from the menu because legacy roles are not an authoritative Supabase authorization source. Existing placeholder routes remain reachable.

Chat option A is used: `/messages` stays intact, with no FloatingChat or MobileChatDrawer. PushPermissionPrompt and useAutoImageRefresh are not mounted. Future search, notifications, XP, push and floating-chat work requires separate Supabase integrations.

The previous Supabase max-width constraint is removed to match the original full-width shell. A 16px/24px content wrapper supplies the padding current page interiors expect. Page interiors themselves are unchanged.

## Validation

- Supabase-mode production build passed (`VITE_ENABLE_SUPABASE_AUTH=true`).
- Targeted ESLint for every changed source/test file passed; `git diff --check` passed.
- Auth service tests: 17/17 passed, including stored-session restoration and refresh lifecycle.
- Profile service tests: 14/14 passed.
- UI suites: 49/50 passed, including all 15 profile/shell tests. The remaining existing missing-configuration test fails in unchanged `SupabaseAuthContext.jsx`: accessing the auth store's friendService getter with a null client throws `SUPABASE_CLIENT_REQUIRED` before routes/shell render. This needs a separate disabled-configuration fix.
- Full lint reports 50 errors in existing files (mostly legacy unused imports and existing FriendsPage/DirectMessagesPage effect dependencies). Full typecheck reports 866 diagnostics in the existing typechecked code. No changed shell file appears in that typecheck output; the current jsconfig does not directly include the new JSX shell directory.
- Traversed 22 local files in the shell import graph: no Base44 imports. UI tests also reject loading the Base44 client. No email relational identity was introduced.
- Browser verification used a temporary synthetic authenticated fixture: desktop expanded and collapsed states, account menu and 390×844 mobile layout. Collapsed sidebar and content offset both measured 64px. Mobile scroll width was 384px in a 390px viewport, with all five bottom navigation items visible. Temporary preview files and browser tab were removed afterward.

Live Supabase login, real persisted browser sessions, Realtime delivery and RLS were not revalidated against production credentials. Their existing implementation was preserved; auth/session/profile regressions were checked with mocked services. No deployment or database operation was performed.
