# Supabase Home UI parity

Implemented for review. No commit or push.

## Files

Created:
- `src/components/supabase/home/SupabaseHomePage.jsx`: legacy section ordering, neutral hero and top strips, responsive feed/sidebar grid.
- `src/components/supabase/home/SupabaseFeedPlaceholder.jsx`: profile initials, disabled composer, explicit unavailable state and empty feed.
- `src/components/supabase/home/SupabaseHomePlaceholderCard.jsx`: shared sidebar section shell with semantic headings and static empty states.
- `tests/supabase-home-ui.test.jsx`: section ordering, safe data boundaries, supported navigation, disabled posting and fallback coverage.
- This report.

Modified:
- `src/SupabaseApp.jsx`: replaces the temporary AccountHome with SupabaseHomePage at `/`. Existing auth gate, shell and other routes are unchanged.

## Dependency audit and section decisions

| Legacy module | Existing dependencies | Home implementation |
| --- | --- | --- |
| HeroCarousel | Base44 DynamicWork and News | Static Zoku gradient hero; current profile greeting; real `/profile` link |
| PlatformBannerStrip | Base44 PlatformBanner | One clearly empty banner footprint; no sponsor, image or external link |
| FeaturedNewsStrip / NewsSection | Base44 News and legacy news helpers | Featured ticker shell and sidebar card with clear empty copy |
| MonthlyRankingStrip | AnimeEntry progress and Base44 DynamicWork | Header and compact empty card; no scores, positions or progress counts |
| FanArtStrip | Base44 FanArt | Compact noninteractive empty strip |
| FanArtAccordion | Pure presentation, but requires artwork and links | Not mounted without real artwork; no empty carousel/accordion controls |
| CreatePostCard / PostCard / PostComments | Base44 Post, Comment, UserProfile, uploads, XP, notifications and moderation | Disabled composer and empty feed; no posting, uploads, comments or reactions |
| RecommendationsSection | Email-scoped entries, legacy recommendation/catalog/poster helpers | Neutral recommendation card; no catalog fallback |
| TrendingSection | TMDB helper and bundled catalog fallback | Neutral trends card; no external fetching or fabricated ranking |
| RecentEpisodesSection | CatalogContext, Base44 CatalogSync and poster helpers | Neutral release card |
| ActiveDebatesSection | Base44 Debate and hard-coded fallback debates | Neutral debate card; fallback records intentionally excluded |

The existing Supabase services cover profile, friendships and direct messages, not these Home content modules. Home uses only the current profile's display name/username and initials. It does not issue additional content or media requests. Existing shell profile signing and chat behavior are unchanged.

## Restored presentation

The page retains the centered 1400px maximum, hero → platform banners → featured news → monthly ranking → fan art → feed/sidebar sequence, 24px grid gap, 16px card spacing, dark cards, borders/radii, theme colors and legacy typography. Shell padding supplies the gutters once.

The hero retains the legacy responsive aspect ratios, 240px minimum and 380px maximum height, rounded border, gradient overlays and bottom-aligned copy. The platform placeholder retains a 300px/440px, 16:9 footprint, constrained to the available width. Ranking and fan-art strips remain compact.

At the large breakpoint, the 12-column grid assigns eight columns to the feed and four to the sidebar. Below it, sidebar modules follow the feed in the original order: recommendations, news, trending, episodes and debates. Existing mobile navigation clearance remains supplied by the shell.

## Truthful unavailable states and differences

Every unavailable section is static and clearly labeled; none uses an indefinite animated loading skeleton. No content titles, posts, artwork, timestamps, rankings, sponsor information, statistics or recommendation results are invented. The composer textarea and Postar button are disabled and associated with visible explanatory text; there is no form submission or upload control.

Carousel arrows/dots/thumbnails, gallery expansion, fake post actions and “view more” links were omitted because there is no corresponding data to display. The single Home action links to the verified `/profile` route. Sidebar placeholder cards preserve the card/header style with a compact empty body rather than reproducing multiple fictional rows. This page intentionally appears emptier than a populated legacy Home.

## Validation

- Full UI suite: **84/85 passed**, including the new three Home tests and all profile, Friends and chat tests. The sole failure is the pre-existing missing-configuration auth case (`SUPABASE_CLIENT_REQUIRED` from the unchanged auth provider/service getter).
- Existing auth/profile/chat service tests: **35/35 passed**. There is no standalone friendship service suite; the nine existing Friends UI tests exercise its service contract.
- Targeted ESLint for new Home components, root routing and Home tests: passed.
- Supabase-enabled production build: passed.
- `git diff --check`: passed.
- Home import graph: **14 local files checked**, no Base44 imports. No email identity, raw private media source, direct content-table query, schema, RLS or service change was introduced.
- Browser validation used a temporary synthetic authenticated shell at **1440, 1024, 768, 390 and 320px**. Desktop uses 12 grid columns and side-by-side feed/sidebar; tablet/mobile use one column with sidebar below. No horizontal overflow at any tested width. At 1024px, feed/sidebar measured 489/233px; at 768px both measured 730px stacked. At 320px, page client and scroll widths were both 320px and the grid was 288px wide.

Temporary preview files and server were removed/stopped. The browser fixture did not contact a live Supabase project. Shell, auth, public-profile privacy and chat regressions are covered by the existing suites; no backend migration was attempted.

## Follow-ups

Review before committing. Connecting hero, platform banners, news, ranking, fan art, feed/comments, recommendations, trends, releases and debates remains separate backend migration work. Address the known missing-configuration auth failure independently.
