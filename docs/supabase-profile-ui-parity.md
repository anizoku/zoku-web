# Supabase profile UI parity

Implemented and validated locally. No commit, push, deployment, SQL, schema, RLS, Storage-policy, auth, friendship or messaging changes were made.

## Files created

- `src/components/supabase/profile/SupabaseProfileHero.jsx`
- `src/components/supabase/profile/SupabaseProfileFavorites.jsx`
- This report.

## Files modified

- `src/components/supabase/ProfilePage.jsx`: delegates presentation to the shared own/public hero in a centered max-w-5xl layout. The public-profile lookup, identity boundary, polling, loading/error/unavailable states remain unchanged.
- `src/components/supabase/EditProfileDialog.jsx`: restores Info/Fotos/Links/Privacidade tabs and legacy secondary input styling. Preserves all current fields, validation and mutateProfile save behavior. Text drafts survive tab switches and photo updates.
- `src/components/supabase/ProfilePhotos.jsx`: integrates signed previews and upload/crop/remove controls into Fotos. Keeps immediate photo saves, restrictions and service operations. Closing, switching tabs and conflicting saves are blocked while a save is pending.
- `src/components/supabase/ProfileMedia.jsx`: explicitly selects getAvatarCropStyle or getBannerCropStyle by media kind. Signed URL lifecycle is unchanged.
- `src/components/profile/CropImageModal.jsx`: small presentation fix to the existing pure shared component. Observes the wrapper after its portal mounts, prevents intrinsic-width overflow, and centers the circular crop window on the image. This fixes the clipped mobile Apply button without changing the crop schema, zoom/offset serialization or service contract.
- `tests/supabase-profile-ui.test.jsx`: updates editor interactions and adds coverage for both media kinds, crop submission, sharing, tab drafts, save locking and public-profile authorization responses.

## Restored presentation

The profile card uses the original dark card, borders/radii, 128px mobile and 208px desktop banner, overlapping 96px avatar with a four-pixel card border, compact name/username/bio, icon links, right-side desktop actions and inline blue favorite-anime badges. Existing shell gutters avoid duplicate page padding. The editor follows the original four-tab structure and integrated photo previews.

## Preserved behavior and intentional differences

Current Supabase data is authoritative: UUID `/u/:profileId` links, authenticated own profile, public-view privacy filtering, safeProfileLink/PROFILE_LINKS sanitation, private avatar/banner buckets, short-lived signed URLs, existing upload/remove/crop operations and version-2 crop data are preserved. No raw Storage path is rendered as a media source or editable URL field. Legacy Base44 pages are unchanged; only the pure shared crop component received the responsive correction above.

Favorite anime remain plain text values. Empty favorites are omitted, as in the legacy presentation. Manga fields, XP/level/rank badges, achievements, stats, activity/posts/list/events tabs, communities, suggestions, streaks, founder calculations and friendship actions are intentionally omitted from the profile. No fabricated counts or progress values were added. The existing global shell is unchanged.

The editor retains Supabase-only display name, country, language and privacy fields, newline-separated anime titles, all supported sanitized social links, Cancel and explicit immediate-media-save guidance. Photo updates remain saved even if text editing is canceled. CropImageModal still uses its existing 4:1 banner editing window; the profile banner uses the requested legacy responsive heights, so visible framing varies with viewport width.

## Validation

- Supabase-mode production build: passed.
- Targeted ESLint for all changed source/test files and git diff --check: passed.
- Auth service tests: 17/17 passed. Profile service tests: 14/14 passed.
- Profile/shell UI suite: 25/25 passed after the crop correction. Covers own/public profiles, both upload/remove/crop flows, signed media, crop transforms, copy success/failure with UUID links, updates after authoritative profile refresh, privacy settings, sanitized links, canceled drafts, save locking, denied public views, logout, sidebar, friends and messages routes.
- Full UI suite: 59/60 passed. The same existing missing-configuration test fails before routes render because the unchanged auth provider accesses a friendService getter with a null client (`SUPABASE_CLIENT_REQUIRED`). No auth-architecture change was made to address it here.
- Full lint/typecheck remain at the previously observed 50 lint errors and 866 type diagnostics. Targeted lint passes; the repository's existing JSX type-inference issues also affect the shared crop component's existing shadcn usages.
- Profile import graph: 22 local files checked, no Base44 imports.
- Browser checks with synthetic local profile/media data: desktop hero and editor, 390px mobile own/public profiles, photo tab, nested banner/avatar crop dialogs. Desktop card measured 1024px and banner 208px; mobile banner measured 128px with no page overflow. Fixed mobile crop dialog measured 388px client and scroll width (previously 504px scroll width). Public media loaded with no owner editing controls.

Live production credentials, actual persisted browser sessions, and production RLS/friends visibility were not exercised. Existing service tests and mocked public-view responses cover the client boundaries; production authorization behavior remains owned by the unchanged backend. No local preview fixtures are retained.

## Follow-ups

Review the changes before committing. Separately fix the existing disabled-configuration auth-provider failure and repository lint/typecheck backlog. Catalog favorites, XP/achievements and social profile modules remain future migrations, outside this step.
