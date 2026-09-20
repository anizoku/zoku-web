# AniZoku — Supabase Schema Mapping (FASE 2)

**Data:** 2026-09-15  
**Fonte canônica:** `src/lib/canonicalSystemDocument.md`  
**Objetivo:** Transformar o modelo Base44 em arquitetura Supabase/Postgres correta — não conversão 1:1.  
**Status:** Documentação/arquitetura apenas. Nenhum SQL, frontend, ou dado será alterado nesta fase.

---

## 1. EXECUTIVE SUMMARY

Este documento propõe a arquitetura target Supabase para o AniZoku, corrigindo as fragilidades estruturais do modelo Base44 atual:

| Problema Base44 | Solução Supabase |
|---|---|
| Relações por email (string) | FKs por `auth.users.id` UUID |
| Sem foreign keys reais | FK constraints com `ON DELETE` |
| Sem unique constraints de negócio | `UNIQUE(user_id, release_id)`, `UNIQUE(provider, provider_id)`, etc. |
| RLS limitada (sem field-level) | RLS granular por coluna + policies SQL completas |
| Arrays como relações (`members[]`, `liked_by[]`) | Junction tables (`community_members`, `post_likes`) |
| Counters manipulados pelo frontend | Triggers / cached counters / views derivadas |
| XP ledger sem atomicidade | `UNIQUE(user_id, idempotency_key)` + RPC `SECURITY DEFINER` |
| Friendship duplicável A↔B | Unique expression index `LEAST/STRICTLY_LESS` |
| Likes via array `liked_by` | `post_likes` junction table |
| Mensagens editáveis pelo receiver | `direct_messages` imutável, `read_at` separado |
| Progress sem atomicidade | RPC `update_progress` transacional |
| Catálogo sem escalabilidade | `works` + `work_releases` + `external_mappings` normalizado |

**Target proposto:**
- **32 tabelas** (vs 34 entidades Base44 — 2 descartadas)
- **8 RPCs** PostgreSQL `SECURITY DEFINER`
- **2 Edge Functions** (Deno)
- **6 buckets** Supabase Storage
- **~18 tabelas MIGRATE, ~6 RESET, ~4 DISCARD**

---

## 2. PRINCIPLES

### P1 — Identidade por UUID, não email
```
auth.users.id (UUID) → referenciado por todas as tabelas como user_id
email permanece apenas em auth.users.email e profiles (denormalizado)
NUNCA: user_email, created_by (email), requester_email como FK
```

### P2 — Constraints de negócio no banco
Toda regra de unicidade, integridade, e relação que hoje depende de lógica aplicativa deve ser **constraint de banco**:
- `UNIQUE(user_id, release_id)` em anime_entries
- `UNIQUE(provider, provider_id)` em external_mappings
- `UNIQUE(user_id, idempotency_key)` em xp_events
- `CHECK(requester_id != receiver_id)` em friendships

### P3 — Atomicidade via RPC
Operações que tocam múltiplas tabelas ou exigem validação server-side usam **RPC PostgreSQL `SECURITY DEFINER`**, não chamadas diretas do cliente:
- `update_progress`, `unlock_achievement`, `grant_xp`
- `send_friend_request`, `accept_friend_request`, `reject_friend_request`, `cancel_friend_request`, `remove_friend`

### P4 — Arrays nunca como relações
`members[]`, `participants[]`, `liked_by[]`, `invited_emails[]` → **junction tables** com FK + UNIQUE.

### P5 — Counters via trigger ou view
`likes_count`, `comments_count`, `members_count` → **trigger de increment/decrement** ou **view derivada**. Frontend nunca atualiza counter diretamente.

### P6 — RLS granular
Cada tabela tem policies explícitas para SELECT, INSERT, UPDATE, DELETE. Onde o cliente não deve escrever, a policy é `USING (false)` ou não existe grant.

### P7 — Hard reset seletivo
Dados de teste (XP, progress, ranking) = **RESET**. Catálogo e editorial = **MIGRATE**. Sync logs = **DISCARD**.

### P8 — ANIME_ONLY reversível
Frozen categories (manga/movie/liveaction) são **configuração**, não schema. Tabelas existem; visibilidade controlada por `work_category_visibilities` + flag de config.

---

## 3. ENTITY-BY-ENTITY MAPPING

### Legenda
- **MIGRATE** — migrar dados existentes
- **REBUILD** — recriar tabela, migrar dados transformados
- **RESET** — recriar tabela vazia (dados de teste descartados)
- **DISCARD** — não migrar (legado/descartável)
- **TEMPORARY** — tabela temporária de migração

---

### 3.1 — User (Built-in)

| | |
|---|---|
| **CURRENT** | Base44 `User` (built-in, read-only: id, email, full_name, role) |
| **TARGET** | `auth.users` (Supabase Auth) + `public.profiles` |
| **DECISION** | **REBUILD** — auth é nativa do Supabase; profiles é tabela custom |
| **Justificativa** | Base44 gerencia auth internamente. Supabase tem `auth.users` nativo. `profiles` estende com dados custom. Role migra para `profiles.role`. |

### 3.2 — UserProfile

| | |
|---|---|
| **CURRENT** | Base44 `UserProfile` (user_email, username, avatar, banner, bio, streaks, etc.) |
| **TARGET** | `public.profiles` (id = auth.users.id) |
| **DECISION** | **REBUILD** — user_email → id UUID; separar streaks se necessário |
| **Justificativa** | 1:1 com auth.users. `id` é PK e FK simultaneamente. Streaks permanecem em profiles (atualizados via RPC). |

### 3.3 — DynamicWork

| | |
|---|---|
| **CURRENT** | Base44 `DynamicWork` (slug, title, franchise_id, seasons[] JSON, etc.) |
| **TARGET** | `public.works` |
| **DECISION** | **REBUILD** — seasons[] JSON → work_releases; franchise_id → self-FK |
| **Justificativa** | `works` representa o franchise/grupo. `seasons[]` JSON serializado é anti-pattern — cada temporada vira uma row em `work_releases`. |

### 3.4 — WorkRelease

| | |
|---|---|
| **CURRENT** | Base44 `WorkRelease` (group_id, slug, category, episode_count, etc.) |
| **TARGET** | `public.work_releases` |
| **DECISION** | **MIGRATE** — group_id → work_id FK |
| **Justificativa** | Estrutura já está correta. Apenas adicionar FK real + UNIQUE(work_id, slug). |

### 3.5 — ExternalMapping

| | |
|---|---|
| **CURRENT** | Base44 `ExternalMapping` (provider, provider_id, work_group_id, work_release_id) |
| **TARGET** | `public.external_mappings` |
| **DECISION** | **MIGRATE** — work_group_id → work_id, work_release_id FK |
| **Justificativa** | Adicionar `UNIQUE(provider, provider_id)` e FKs reais. |

### 3.6 — CatalogSync

| | |
|---|---|
| **CURRENT** | Base44 `CatalogSync` (cache legado de sync) |
| **TARGET** | — |
| **DECISION** | **DISCARD** — substituída por works + work_releases + external_mappings |
| **Justificativa** | Entidade legada. Dados já migrados para o novo modelo. |

### 3.7 — MediaWork

| | |
|---|---|
| **CURRENT** | Base44 `MediaWork` (catálogo legado) |
| **TARGET** | — |
| **DECISION** | **DISCARD** — substituída por works/work_releases |
| **Justificativa** | Usada apenas no admin CatalogManager legado. |

### 3.8 — CardOverride

| | |
|---|---|
| **CURRENT** | Base44 `CardOverride` (override de título/descrição/imagem por categoria) |
| **TARGET** | `public.card_overrides` |
| **DECISION** | **MIGRATE** — card_slug → work_slug FK opcional |
| **Justificativa** | Funcionalidade válida. Adicionar FK para works.slug. |

### 3.9 — WorkCategoryVisibility

| | |
|---|---|
| **CURRENT** | Base44 `WorkCategoryVisibility` (show_in_animes, show_in_mangas, etc.) |
| **TARGET** | `public.work_category_visibilities` |
| **DECISION** | **MIGRATE** — work_slug → work_slug FK |
| **Justificativa** | Controla ANIME_ONLY. Manter como config reversível. |

### 3.10 — AnimeEntry

| | |
|---|---|
| **CURRENT** | Base44 `AnimeEntry` (title, type, status, current_episode, release_id, season_mal_id) |
| **TARGET** | `public.anime_entries` |
| **DECISION** | **RESET** — dados de progresso são de teste |
| **Justificativa** | Progresso é dado de usuário (teste). Schema recriado com `user_id UUID`, `work_id FK`, `release_id FK`, `UNIQUE(user_id, release_id)`. |

### 3.11 — XpEvent

| | |
|---|---|
| **CURRENT** | Base44 `XpEvent` (user_email, event_type, xp_amount, idempotency_key) |
| **TARGET** | `public.xp_events` |
| **DECISION** | **RESET** — XP de teste descartado |
| **Justificativa** | Ledger de teste. Schema recriado com `UNIQUE(user_id, idempotency_key)`, RLS admin-only write, inserts via RPC apenas. |

### 3.12 — UserAchievement

| | |
|---|---|
| **CURRENT** | Base44 `UserAchievement` (user_email, achievement_key) |
| **TARGET** | `public.user_achievements` |
| **DECISION** | **RESET** — conquistas de teste descartadas |
| **Justificativa** | `UNIQUE(user_id, achievement_key)`, RLS admin-only write, criação via RPC `unlock_achievement`. |

### 3.13 — Achievement

| | |
|---|---|
| **CURRENT** | Base44 `Achievement` (key, name, icon, xp) |
| **TARGET** | `public.achievements` |
| **DECISION** | **MIGRATE** — catálogo estático |
| **Justificativa** | Catálogo de conquistas. `key` como UNIQUE. XP values ficam no código (xpConstants), não nesta tabela. |

### 3.14 — Friendship

| | |
|---|---|
| **CURRENT** | Base44 `Friendship` (requester_email, receiver_email, status) |
| **TARGET** | `public.friendships` |
| **DECISION** | **RESET** — amizades de teste descartadas |
| **Justificativa** | Modelo vulnerável (duplicável A↔B). Recriar com `requester_id`/`receiver_id` UUID, `CHECK(requester_id != receiver_id)`, unique expression index para impedir duplicação. |

### 3.15 — DirectMessage

| | |
|---|---|
| **CURRENT** | Base44 `DirectMessage` (sender_email, receiver_email, content, is_read) |
| **TARGET** | `public.direct_messages` |
| **DECISION** | **RESET** — mensagens de teste descartadas |
| **Justificativa** | `sender_id`/`receiver_id` UUID. Content imutável. `is_read` → `read_at timestamptz` (receiver marca leitura). |

### 3.16 — Notification

| | |
|---|---|
| **CURRENT** | Base44 `Notification` (recipient_email, type, message, from_email, reference_id, is_read) |
| **TARGET** | `public.notifications` |
| **DECISION** | **RESET** — notificações de teste descartadas |
| **Justificativa** | `recipient_id`/`actor_id` UUID. `reference_id` → `reference_type` + `reference_id` (polymorphic). `is_read` → `read_at`. |

### 3.17 — ActivityFeed

| | |
|---|---|
| **CURRENT** | Base44 `ActivityFeed` (actor_email, target_email, activity_type, media_title) |
| **TARGET** | `public.activity_feed` |
| **DECISION** | **RESET** — atividade de teste descartada |
| **Justificativa** | `actor_id`/`target_id` UUID. |

### 3.18 — WatchTogether

| | |
|---|---|
| **CURRENT** | Base44 `WatchTogether` (initiator_email, friend_email, media_title, status, notified_5, notified_1) |
| **TARGET** | `public.watch_together` |
| **DECISION** | **RESET** — dados de teste |
| **Justificativa** | `initiator_id`/`friend_id` UUID. `media_title` → `work_id` FK (quando possível). |

### 3.19 — SocialEvent

| | |
|---|---|
| **CURRENT** | Base44 `SocialEvent` (organizer_email, participants[], participants_names[]) |
| **TARGET** | `public.events` + `public.event_participants` |
| **DECISION** | **RESET** — dados de teste |
| **Justificativa** | `organizer_id` UUID. `participants[]` array → junction table `event_participants`. |

### 3.20 — EventComment

| | |
|---|---|
| **CURRENT** | Base44 `EventComment` (event_id, content, author_email) |
| **TARGET** | `public.event_comments` |
| **DECISION** | **RESET** — dados de teste |
| **Justificativa** | `author_id` UUID, `event_id` FK. |

### 3.21 — Community

| | |
|---|---|
| **CURRENT** | Base44 `Community` (name, creator_email, members[], members_count) |
| **TARGET** | `public.communities` + `public.community_members` |
| **DECISION** | **RESET** — dados de teste |
| **Justificativa** | `creator_id` UUID. `members[]` → junction table. `members_count` via trigger. |

### 3.22 — Post

| | |
|---|---|
| **CURRENT** | Base44 `Post` (content, image_url, liked_by[], likes_count, comments_count, author_name, author_avatar) |
| **TARGET** | `public.posts` |
| **DECISION** | **RESET** — posts de teste |
| **Justificativa** | `author_id` UUID. `liked_by[]` → `post_likes` junction. `likes_count`/`comments_count` via trigger. `author_name`/`author_avatar` denormalizados via trigger de insert. |

### 3.23 — Comment

| | |
|---|---|
| **CURRENT** | Base44 `Comment` (post_id, parent_id, content, author_name, liked_by[], likes_count) |
| **TARGET** | `public.comments` |
| **DECISION** | **RESET** — comentários de teste |
| **Justificativa** | `author_id` UUID. `liked_by[]` → `comment_likes` junction. `likes_count` via trigger. |

### 3.24 — Debate

| | |
|---|---|
| **CURRENT** | Base44 `Debate` (title, author_name, tags[], is_hot) |
| **TARGET** | `public.debates` |
| **DECISION** | **MIGRATE** — conteúdo editorial admin-curated |
| **Justificativa** | Admin-only. Pode migrar. `tags[]` permanece array (não é relação). |

### 3.25 — News

| | |
|---|---|
| **CURRENT** | Base44 `News` (title, slug, content, category, images, video, sources[], status, author_id) |
| **TARGET** | `public.news` |
| **DECISION** | **MIGRATE** — conteúdo editorial |
| **Justificativa** | `author_id` UUID FK. `sources[]` permanece JSONB. RLS: public read apenas `status='publicado'`. |

### 3.26 — FanArt

| | |
|---|---|
| **CURRENT** | Base44 `FanArt` (image_url, work_slug, artist_name, active, order) |
| **TARGET** | `public.fan_art` |
| **DECISION** | **MIGRATE** — conteúdo editorial |
| **Justificativa** | `work_slug` → FK opcional para `works.slug`. RLS: public read `active=true`. |

### 3.27 — PlatformBanner

| | |
|---|---|
| **CURRENT** | Base44 `PlatformBanner` (image_url, title, link_url, active, order) |
| **TARGET** | `public.platform_banners` |
| **DECISION** | **MIGRATE** |
| **Justificativa** | Simples. Manter como está. |

### 3.28 — LoginBackgroundImage

| | |
|---|---|
| **CURRENT** | Base44 `LoginBackgroundImage` (image_url, title, active, order) |
| **TARGET** | `public.login_background_images` |
| **DECISION** | **MIGRATE** |
| **Justificativa** | Simples. Manter como está. |

### 3.29 — SiteConfig

| | |
|---|---|
| **CURRENT** | Base44 `SiteConfig` (label, logo URLs, achievement_sound_url) |
| **TARGET** | `public.site_config` |
| **DECISION** | **MIGRATE** |
| **Justificativa** | Singleton. Manter como está. |

### 3.30 — SyncRun

| | |
|---|---|
| **CURRENT** | Base44 `SyncRun` (run_id, dry_run, status, summary) |
| **TARGET** | `public.sync_runs` |
| **DECISION** | **DISCARD** — histórico de sync não é necessário |
| **Justificativa** | Nova infraestrutura começa limpa. Se necessário, recriar tabela vazia. |

### 3.31 — SyncLog

| | |
|---|---|
| **CURRENT** | Base44 `SyncLog` (run_id, release_id, classification, fields JSON) |
| **TARGET** | — |
| **DECISION** | **DISCARD** |
| **Justificativa** | Histórico de sync descartável. |

### 3.32 — SyncConflict

| | |
|---|---|
| **CURRENT** | Base44 `SyncConflict` (provider, provider_id, conflict_type, status) |
| **TARGET** | `public.sync_conflicts` |
| **DECISION** | **DISCARD** — recriar vazio se necessário |
| **Justificativa** | Conflitos antigos não relevantes. Tabela pode ser recriada vazia para nova infra. |

### 3.33 — ContentReport

| | |
|---|---|
| **CURRENT** | Base44 `ContentReport` (reported_by_email, content_type, content_id, reason, status) |
| **TARGET** | `public.content_reports` |
| **DECISION** | **RESET** — reports de teste descartados |
| **Justificativa** | `reported_by_id` UUID. `content_id` → `reference_type` + `reference_id` (polymorphic). |

### 3.34 — WorkSuggestion

| | |
|---|---|
| **CURRENT** | Base44 `WorkSuggestion` (suggested_by_email, title, mal_id, status) |
| **TARGET** | `public.work_suggestions` |
| **DECISION** | **RESET** — sugestões de teste descartadas |
| **Justificativa** | `suggested_by_id` UUID. |

---

## 4. FULL TARGET SCHEMA PROPOSAL

### Convenções
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()` (com trigger)
- FKs: `REFERENCES target(id) ON DELETE CASCADE | SET NULL | RESTRICT`
- Timestamps em `timestamptz`, nunca `timestamp`

---

### 4.1 — `public.profiles`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| username | text | NOT NULL | — | UNIQUE |
| display_name | text | | | |
| bio | text | | | |
| avatar_url | text | | | |
| avatar_crop | jsonb | | | {scale, offsetX, offsetY} |
| banner_url | text | | | |
| banner_crop | jsonb | | | |
| country | text | | | |
| preferred_language | text | NOT NULL | 'pt' | CHECK in (pt,en,es,ja,other) |
| links | jsonb | NOT NULL | '{}' | {twitter, instagram, website} |
| favorite_animes | text[] | NOT NULL | '{}' | |
| favorite_mangas | text[] | NOT NULL | '{}' | |
| selected_badge_id | text | | | FK → achievements(key) ON DELETE SET NULL |
| list_visibility | text | NOT NULL | 'public' | CHECK in (public,friends,private) |
| profile_visibility | text | NOT NULL | 'public' | CHECK in (public,friends,private) |
| profile_setup_completed | boolean | NOT NULL | false | |
| profile_setup_completed_at | timestamptz | | | |
| push_enabled | boolean | NOT NULL | false | |
| achievement_sound_enabled | boolean | NOT NULL | true | |
| current_streak | integer | NOT NULL | 0 | Updated via RPC only |
| last_activity_date | date | | | Updated via RPC only |
| login_streak | integer | NOT NULL | 0 | |
| role | text | NOT NULL | 'user' | CHECK in (admin,user) |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | Trigger |

**Constraints:**
- PK: `id`
- UNIQUE: `username`
- FK: `id → auth.users(id) ON DELETE CASCADE`
- FK: `selected_badge_id → achievements(key) ON DELETE SET NULL`
- CHECK: `preferred_language IN ('pt','en','es','ja','other')`
- CHECK: `list_visibility IN ('public','friends','private')`
- CHECK: `profile_visibility IN ('public','friends','private')`
- CHECK: `role IN ('admin','user')`

**Indexes:**
- `idx_profiles_username` ON `username` (para busca)

---

### 4.2 — `public.works` (ex-DynamicWork)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| slug | text | NOT NULL | — | UNIQUE |
| title | text | NOT NULL | — | Título principal |
| title_pt | text | | | |
| romaji_title | text | | | |
| franchise_id | UUID | | | Self-FK (raiz do franchise) |
| franchise_title | text | | | Denormalizado |
| franchise_score | numeric(3,1) | | | Admin override |
| franchise_poster_url | text | | | Admin override |
| categories | text[] | NOT NULL | '{}' | |
| genres | text[] | NOT NULL | '{}' | |
| synopsis | text | | | |
| score | numeric(3,1) | | | |
| year | integer | | | |
| is_trending | boolean | NOT NULL | false | |
| trending_rank | integer | | | |
| is_currently_airing | boolean | NOT NULL | false | |
| season | text | | | |
| season_year | integer | | | |
| sync_status | text | NOT NULL | 'synced' | CHECK in (synced,manual_override) |
| last_synced_at | timestamptz | | | |
| release_count | integer | NOT NULL | 0 | Via trigger |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `slug`
- FK: `franchise_id → works(id) ON DELETE SET NULL` (self-reference)
- CHECK: `sync_status IN ('synced','manual_override')`

**Indexes:**
- `idx_works_slug` ON `slug`
- `idx_works_franchise_id` ON `franchise_id`
- `idx_works_is_trending` ON `is_trending` WHERE `is_trending = true`
- `idx_works_title` ON `title` (para busca)

**Notas:** `seasons[]` JSON do Base44 **NÃO migra** — cada temporada vira row em `work_releases`. Campos `episodes`, `chapters`, `volumes`, `anime_status`, `manga_status`, `mal_id`, `manga_mal_id`, `duration`, `image_url`, `source`, `popularity_rank` **não migram** (movidos para `work_releases` ou descartados como legado).

---

### 4.3 — `public.work_releases`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| work_id | UUID | NOT NULL | — | FK → works(id) ON DELETE CASCADE |
| work_slug | text | NOT NULL | — | Denormalizado |
| slug | text | NOT NULL | — | UNIQUE within work |
| title | text | NOT NULL | — | |
| title_romaji | text | | | |
| title_english | text | | | |
| title_native | text | | | |
| category | text | NOT NULL | — | CHECK in (anime,manga,movie,liveaction) |
| format | text | | | TV/MOVIE/OVA/ONA/SPECIAL/MANGA/NOVEL |
| season | text | | | winter/spring/summer/fall |
| season_year | integer | | | |
| episode_count | integer | | | |
| chapter_count | integer | | | |
| duration_minutes | integer | | | |
| release_order | integer | | | |
| display_order | integer | | | |
| status | text | NOT NULL | 'not_yet_released' | CHECK in (releasing,finished,not_yet_released,cancelled,hiatus) |
| is_main_entry | boolean | NOT NULL | false | |
| is_special | boolean | NOT NULL | false | |
| is_movie | boolean | NOT NULL | false | |
| is_live_action | boolean | NOT NULL | false | |
| synopsis | text | | | |
| cover_url | text | | | |
| banner_url | text | | | |
| score | numeric(3,1) | | | |
| popularity | integer | | | |
| trending_score | integer | NOT NULL | 0 | |
| trending_rank | integer | | | |
| sync_status | text | NOT NULL | 'pending' | CHECK in (synced,pending,manual_override) |
| last_synced_at | timestamptz | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(work_id, slug)`
- FK: `work_id → works(id) ON DELETE CASCADE`
- CHECK: `category IN ('anime','manga','movie','liveaction')`
- CHECK: `status IN ('releasing','finished','not_yet_released','cancelled','hiatus')`
- CHECK: `sync_status IN ('synced','pending','manual_override')`

**Indexes:**
- `idx_work_releases_work_id` ON `work_id`
- `idx_work_releases_slug` ON `slug`
- `idx_work_releases_category` ON `category`
- `idx_work_releases_status` ON `status`
- `idx_work_releases_trending` ON `trending_rank` WHERE `trending_rank IS NOT NULL`

---

### 4.4 — `public.external_mappings`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| work_id | UUID | | | FK → works(id) ON DELETE CASCADE |
| work_release_id | UUID | | | FK → work_releases(id) ON DELETE CASCADE |
| provider | text | NOT NULL | — | CHECK in (anilist,mal,tmdb,thetvdb) |
| provider_id | text | NOT NULL | — | String p/ IDs grandes |
| provider_url | text | | | |
| provider_type | text | | | anime/manga/movie/tv |
| confidence_score | numeric(5,2) | NOT NULL | 100.00 | |
| verified_by_admin | boolean | NOT NULL | false | |
| last_synced_at | timestamptz | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(provider, provider_id)`
- FK: `work_id → works(id) ON DELETE CASCADE`
- FK: `work_release_id → work_releases(id) ON DELETE CASCADE`
- CHECK: `provider IN ('anilist','mal','tmdb','thetvdb')`
- CHECK: `work_id IS NOT NULL OR work_release_id IS NOT NULL` (pelo menos um)

**Indexes:**
- `idx_external_mappings_provider` ON `(provider, provider_id)`
- `idx_external_mappings_work_id` ON `work_id`
- `idx_external_mappings_work_release_id` ON `work_release_id`

---

### 4.5 — `public.anime_entries`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| work_id | UUID | | | FK → works(id) ON DELETE SET NULL |
| release_id | UUID | | | FK → work_releases(id) ON DELETE SET NULL |
| title | text | NOT NULL | — | Snapshot canônico |
| type | text | NOT NULL | 'anime' | CHECK in (anime,manga) |
| cover_url | text | | | |
| status | text | NOT NULL | 'planned' | CHECK in (watching,reading,completed,planned,dropped,on_hold) |
| current_episode | integer | NOT NULL | 0 | CHECK >= 0 |
| total_episodes | integer | | | CHECK >= 0 |
| current_chapter | integer | NOT NULL | 0 | CHECK >= 0 |
| total_chapters | integer | | | CHECK >= 0 |
| rating | numeric(2,1) | | | CHECK 1-10 |
| notes | text | | | |
| genre | text | | | |
| external_provider | text | | | Provider provisório |
| external_provider_id | text | | | |
| external_provider_type | text | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(user_id, release_id)` — **onde release_id IS NOT NULL**
- FK: `user_id → auth.users(id) ON DELETE CASCADE`
- FK: `work_id → works(id) ON DELETE SET NULL`
- FK: `release_id → work_releases(id) ON DELETE SET NULL`
- CHECK: `type IN ('anime','manga')`
- CHECK: `status IN ('watching','reading','completed','planned','dropped','on_hold')`
- CHECK: `current_episode >= 0`
- CHECK: `current_chapter >= 0`
- CHECK: `rating IS NULL OR (rating >= 1 AND rating <= 10)`

**Partial unique index (legacy sem release_id):**
```sql
CREATE UNIQUE INDEX idx_anime_entries_user_release
  ON anime_entries(user_id, release_id)
  WHERE release_id IS NOT NULL;
```
Entries legacy sem `release_id` não têm constraint de unicidade (múltiplas entries por título permitidas temporariamente).

**Indexes:**
- `idx_anime_entries_user_id` ON `user_id`
- `idx_anime_entries_work_id` ON `work_id`
- `idx_anime_entries_release_id` ON `release_id`
- `idx_anime_entries_status` ON `status`

**Notas:** `season_mal_id` (legado) **não migra** — substituído por `release_id`. Frontend **não atualiza** `current_episode`/`current_chapter`/`status=completed` diretamente — via RPC `update_progress`.

---

### 4.6 — `public.xp_events`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| event_type | text | NOT NULL | — | CHECK in (achievement_unlocked,level_up,episode_watched,chapter_read,post_created,work_completed,anime_added,legacy_migration) |
| achievement_id | text | | | FK → achievements(key) ON DELETE SET NULL |
| xp_amount | integer | NOT NULL | 0 | |
| source_type | text | | | anime_entry/post/achievement |
| source_id | text | | | |
| idempotency_key | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(user_id, idempotency_key)` — **atomicidade real**
- FK: `user_id → auth.users(id) ON DELETE CASCADE`
- FK: `achievement_id → achievements(key) ON DELETE SET NULL`
- CHECK: `event_type IN ('achievement_unlocked','level_up','episode_watched','chapter_read','post_created','work_completed','anime_added','legacy_migration')`

**Indexes:**
- `idx_xp_events_user_created` ON `(user_id, created_at DESC)`
- `idx_xp_events_idempotency` ON `(user_id, idempotency_key)` (já é unique)

**RLS:**
| Op | Policy |
|---|---|
| SELECT | user lê próprios OU admin lê tudo |
| INSERT | **false** (apenas RPC SECURITY DEFINER) |
| UPDATE | **false** |
| DELETE | **false** (admin only via service role) |

---

### 4.7 — `public.user_achievements`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| achievement_key | text | NOT NULL | — | FK → achievements(key) ON DELETE CASCADE |
| unlocked_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(user_id, achievement_key)`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`
- FK: `achievement_key → achievements(key) ON DELETE CASCADE`

**Indexes:**
- `idx_user_achievements_user` ON `user_id`

**RLS:**
| Op | Policy |
|---|---|
| SELECT | public (qualquer autenticado) |
| INSERT | **false** (apenas RPC) |
| UPDATE | **false** |
| DELETE | **false** (admin only) |

---

### 4.8 — `public.achievements`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| key | text | NOT NULL | — | PK (estável) |
| name | text | NOT NULL | — | |
| description | text | | | |
| icon | text | | | lucide-react name |
| category | text | | | |
| xp | integer | NOT NULL | 0 | Display only — valores reais no código |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `key`
- UNIQUE: `key` (já é PK)

---

### 4.9 — `public.friendships`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| requester_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| receiver_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| status | text | NOT NULL | 'pending' | CHECK in (pending,accepted,rejected) |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- CHECK: `requester_id != receiver_id`
- FK: `requester_id → auth.users(id) ON DELETE CASCADE`
- FK: `receiver_id → auth.users(id) ON DELETE CASCADE`
- CHECK: `status IN ('pending','accepted','rejected')`

**Unique expression index (impede duplicação A↔B):**
```sql
CREATE UNIQUE INDEX idx_friendships_unique_pair
  ON friendships (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id));
```
Isto garante que se A→B existe, B→A não pode ser criada (mesmo par canônico).

**Indexes:**
- `idx_friendships_requester` ON `requester_id`
- `idx_friendships_receiver` ON `receiver_id`
- `idx_friendships_status` ON `status`

**RLS:**
| Op | Policy |
|---|---|
| SELECT | requester OU receiver |
| INSERT | **false** (via RPC `send_friend_request`) |
| UPDATE | **false** (via RPC `accept`/`reject`) |
| DELETE | **false** (via RPC `cancel`/`remove`) |

---

### 4.10 — `public.posts`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| author_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| content | text | NOT NULL | — | |
| image_url | text | | | |
| anime_title | text | | | |
| post_type | text | NOT NULL | 'general' | CHECK in (discussion,review,reaction,theory,general) |
| community_id | UUID | | | FK → communities(id) ON DELETE SET NULL |
| likes_count | integer | NOT NULL | 0 | Via trigger |
| comments_count | integer | NOT NULL | 0 | Via trigger |
| author_name | text | | | Denormalizado via trigger |
| author_avatar | text | | | Denormalizado via trigger |
| author_level | integer | NOT NULL | 1 | Denormalizado via trigger |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `author_id → auth.users(id) ON DELETE CASCADE`
- FK: `community_id → communities(id) ON DELETE SET NULL`
- CHECK: `post_type IN ('discussion','review','reaction','theory','general')`

**Indexes:**
- `idx_posts_author_id` ON `author_id`
- `idx_posts_community_id` ON `community_id`
- `idx_posts_created_at` ON `created_at DESC`

**Triggers:**
- `trigger_posts_denormalize_author` — on INSERT, copia `profiles.display_name`/`avatar_url`/level para `author_name`/`author_avatar`/`author_level`
- `trigger_posts_likes_count` — increment/decrement quando row em `post_likes` é criada/deletada
- `trigger_posts_comments_count` — increment/decrement quando row em `comments` é criada/deletada

---

### 4.11 — `public.post_likes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| post_id | UUID | NOT NULL | — | FK → posts(id) ON DELETE CASCADE |
| created_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(user_id, post_id)` — um like por user por post
- FK: `user_id → auth.users(id) ON DELETE CASCADE`
- FK: `post_id → posts(id) ON DELETE CASCADE`

**Indexes:**
- `idx_post_likes_post_id` ON `post_id`
- `idx_post_likes_user_id` ON `user_id`

**RLS:**
| Op | Policy |
|---|---|
| SELECT | public |
| INSERT | user_id = auth.uid() |
| DELETE | user_id = auth.uid() |
| UPDATE | **false** |

---

### 4.12 — `public.comments`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| post_id | UUID | NOT NULL | — | FK → posts(id) ON DELETE CASCADE |
| parent_id | UUID | | | FK → comments(id) ON DELETE CASCADE (self-ref) |
| author_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| content | text | NOT NULL | — | |
| author_name | text | | | Denormalizado via trigger |
| author_avatar | text | | | Denormalizado via trigger |
| likes_count | integer | NOT NULL | 0 | Via trigger |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `post_id → posts(id) ON DELETE CASCADE`
- FK: `parent_id → comments(id) ON DELETE CASCADE`
- FK: `author_id → auth.users(id) ON DELETE CASCADE`

**Indexes:**
- `idx_comments_post_id` ON `(post_id, created_at)`
- `idx_comments_author_id` ON `author_id`
- `idx_comments_parent_id` ON `parent_id`

---

### 4.13 — `public.comment_likes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| comment_id | UUID | NOT NULL | — | FK → comments(id) ON DELETE CASCADE |
| created_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(user_id, comment_id)`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`
- FK: `comment_id → comments(id) ON DELETE CASCADE`

---

### 4.14 — `public.direct_messages`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| sender_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| receiver_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| content | text | NOT NULL | — | Imutável |
| read_at | timestamptz | | | NULL = não lida |
| created_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `sender_id → auth.users(id) ON DELETE CASCADE`
- FK: `receiver_id → auth.users(id) ON DELETE CASCADE`

**Indexes:**
- `idx_dm_sender` ON `sender_id`
- `idx_dm_receiver` ON `receiver_id`
- `idx_dm_conversation` ON `(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at)` — para query de conversa

**RLS:**
| Op | Policy |
|---|---|
| SELECT | sender OU receiver |
| INSERT | sender_id = auth.uid() |
| UPDATE | **apenas `read_at`**, e apenas receiver pode setar |
| DELETE | **false** (mensagens imutáveis) |

**Nota:** `UPDATE` policy permite apenas `read_at`, não `content`. Implementado via column-level RLS ou trigger de validação.

---

### 4.15 — `public.notifications`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| recipient_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| actor_id | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| type | text | NOT NULL | — | CHECK in (friend_request,friend_accepted,post_liked,post_commented,event_invite,event_reminder,list_update,watch_together_invite,watch_together_near_5,watch_together_near_1,direct_message,mention,event_message) |
| message | text | NOT NULL | — | |
| reference_type | text | | | post/comment/event/etc. |
| reference_id | text | | | |
| read_at | timestamptz | | | NULL = não lida |
| created_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `recipient_id → auth.users(id) ON DELETE CASCADE`
- FK: `actor_id → auth.users(id) ON DELETE SET NULL`
- CHECK: `type IN ('friend_request','friend_accepted','post_liked','post_commented','event_invite','event_reminder','list_update','watch_together_invite','watch_together_near_5','watch_together_near_1','direct_message','mention','event_message')`

**Indexes:**
- `idx_notifications_recipient` ON `(recipient_id, read_at, created_at DESC)` — unread first
- `idx_notifications_recipient_unread` ON `recipient_id` WHERE `read_at IS NULL`

**RLS:**
| Op | Policy |
|---|---|
| SELECT | recipient_id = auth.uid() |
| INSERT | **false** (via RPC/trigger) |
| UPDATE | recipient_id = auth.uid() (apenas `read_at`) |
| DELETE | recipient_id = auth.uid() OU admin |

---

### 4.16 — `public.activity_feed`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| actor_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| target_id | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| activity_type | text | NOT NULL | — | CHECK in (watch_together_created,list_commented,event_invited,started_watching_together,friend_added) |
| media_title | text | | | |
| media_episode | integer | | | |
| description | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `actor_id → auth.users(id) ON DELETE CASCADE`
- FK: `target_id → auth.users(id) ON DELETE SET NULL`
- CHECK: `activity_type IN ('watch_together_created','list_commented','event_invited','started_watching_together','friend_added')`

**Indexes:**
- `idx_activity_actor` ON `actor_id`
- `idx_activity_target` ON `target_id`
- `idx_activity_created` ON `created_at DESC`

---

### 4.17 — `public.communities`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | text | NOT NULL | — | |
| description | text | | | |
| cover_url | text | | | |
| avatar_url | text | | | |
| creator_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE SET NULL |
| category | text | NOT NULL | 'general' | CHECK in (anime,manga,general,theories,reviews,news) |
| tags | text[] | NOT NULL | '{}' | |
| members_count | integer | NOT NULL | 0 | Via trigger |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `creator_id → auth.users(id) ON DELETE SET NULL`
- CHECK: `category IN ('anime','manga','general','theories','reviews','news')`

---

### 4.18 — `public.community_members`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| community_id | UUID | NOT NULL | — | FK → communities(id) ON DELETE CASCADE |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| joined_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(community_id, user_id)`
- FK: `community_id → communities(id) ON DELETE CASCADE`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`

**Trigger:** increment/decrement `communities.members_count` on insert/delete.

---

### 4.19 — `public.events` (ex-SocialEvent)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| title | text | NOT NULL | — | |
| description | text | | | |
| media_title | text | | | |
| event_type | text | NOT NULL | 'watch_episode' | CHECK in (watch_episode,watch_marathon,read_chapter,debate,theory_night,watch_party) |
| media_type | text | NOT NULL | 'anime' | CHECK in (anime,manga) |
| event_date | timestamptz | NOT NULL | — | |
| max_participants | integer | | | |
| visibility | text | NOT NULL | 'public' | CHECK in (public,friends,private) |
| status | text | NOT NULL | 'scheduled' | CHECK in (scheduled,happening,finished) |
| organizer_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| organizer_name | text | | | Denormalizado |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `organizer_id → auth.users(id) ON DELETE CASCADE`

---

### 4.20 — `public.event_participants`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| event_id | UUID | NOT NULL | — | FK → events(id) ON DELETE CASCADE |
| user_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| joined_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(event_id, user_id)`
- FK: `event_id → events(id) ON DELETE CASCADE`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`

---

### 4.21 — `public.event_comments`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| event_id | UUID | NOT NULL | — | FK → events(id) ON DELETE CASCADE |
| author_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| content | text | NOT NULL | — | |
| author_name | text | | | Denormalizado |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `event_id → events(id) ON DELETE CASCADE`
- FK: `author_id → auth.users(id) ON DELETE CASCADE`

---

### 4.22 — `public.watch_together`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| initiator_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| friend_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| initiator_name | text | | | Denormalizado |
| friend_name | text | | | Denormalizado |
| media_title | text | NOT NULL | — | |
| work_id | UUID | | | FK → works(id) ON DELETE SET NULL |
| media_type | text | NOT NULL | 'anime' | CHECK in (anime,manga) |
| target_episode | integer | | | |
| target_chapter | integer | | | |
| status | text | NOT NULL | 'pending' | CHECK in (pending,accepted,rejected,completed) |
| notified_5 | boolean | NOT NULL | false | |
| notified_1 | boolean | NOT NULL | false | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `initiator_id → auth.users(id) ON DELETE CASCADE`
- FK: `friend_id → auth.users(id) ON DELETE CASCADE`
- FK: `work_id → works(id) ON DELETE SET NULL`
- CHECK: `media_type IN ('anime','manga')`
- CHECK: `status IN ('pending','accepted','rejected','completed')`

---

### 4.23 — `public.debates`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| title | text | NOT NULL | — | |
| description | text | | | |
| anime_title | text | | | |
| author_name | text | | | |
| replies_count | integer | NOT NULL | 0 | |
| is_hot | boolean | NOT NULL | false | |
| tags | text[] | NOT NULL | '{}' | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`

**RLS:** Admin-only write, public read.

---

### 4.24 — `public.news`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| title | text | NOT NULL | — | |
| slug | text | NOT NULL | — | UNIQUE |
| summary | text | | | |
| content | text | | | Markdown |
| category | text | NOT NULL | 'general' | CHECK in (anime,manga,movie,liveaction,general) |
| banner_image_url | text | | | |
| card_image_url | text | | | |
| article_image_url | text | | | |
| video_type | text | NOT NULL | 'none' | CHECK in (none,embed,file) |
| video_url | text | | | |
| video_provider | text | | | |
| sources | jsonb | NOT NULL | '[]' | [{name, url}] |
| published_at | timestamptz | | | |
| is_featured | boolean | NOT NULL | false | |
| author_id | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| author_name | text | | | Denormalizado |
| status | text | NOT NULL | 'rascunho' | CHECK in (rascunho,publicado) |
| reading_minutes | integer | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `slug`
- FK: `author_id → auth.users(id) ON DELETE SET NULL`
- CHECK: `category IN ('anime','manga','movie','liveaction','general')`
- CHECK: `video_type IN ('none','embed','file')`
- CHECK: `status IN ('rascunho','publicado')`

**Indexes:**
- `idx_news_slug` ON `slug`
- `idx_news_status_published` ON `published_at DESC` WHERE `status = 'publicado'`
- `idx_news_featured` ON `is_featured` WHERE `is_featured = true`

**RLS:** Public read apenas `status='publicado'`; admin full.

**Campos legados NÃO migrados:** `image_url`, `source_url`, `source_name` (substituídos por `banner/card/article_image_url` e `sources[]`).

---

### 4.25 — `public.fan_art`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| image_url | text | NOT NULL | — | |
| title | text | | | |
| work_slug | text | | | FK → works(slug) ON DELETE SET NULL |
| work_title | text | | | Denormalizado |
| artist_name | text | | | |
| artist_instagram | text | | | |
| artist_twitter | text | | | |
| artist_website | text | | | |
| source_url | text | | | |
| credit_notes | text | | | Admin only |
| active | boolean | NOT NULL | true | |
| sort_order | integer | NOT NULL | 0 | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `work_slug → works(slug) ON DELETE SET NULL`

**RLS:** Public read `active=true`; admin full.

---

### 4.26 — `public.platform_banners`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| image_url | text | NOT NULL | — | |
| title | text | | | |
| link_url | text | | | |
| active | boolean | NOT NULL | true | |
| sort_order | integer | NOT NULL | 0 | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

---

### 4.27 — `public.login_background_images`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| image_url | text | NOT NULL | — | |
| title | text | | | |
| active | boolean | NOT NULL | true | |
| sort_order | integer | NOT NULL | 0 | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

---

### 4.28 — `public.site_config`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| label | text | NOT NULL | 'default' | UNIQUE |
| logo_compact_url | text | | | |
| logo_full_url | text | | | |
| achievement_sound_url | text | | | |
| updated_by | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

---

### 4.29 — `public.card_overrides`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| work_slug | text | NOT NULL | — | FK → works(slug) ON DELETE CASCADE |
| category | text | | | CHECK in (anime,manga,movie,liveaction) |
| override_title | text | | | |
| override_description | text | | | |
| override_image_url | text | | | |
| is_manual_override | boolean | NOT NULL | true | |
| sync_disabled | boolean | NOT NULL | true | |
| edited_by | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| edited_by_name | text | | | |
| edited_at | timestamptz | | | |
| original_snapshot | jsonb | | | |
| notes | text | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `(work_slug, category)` — um override por obra por categoria
- FK: `work_slug → works(slug) ON DELETE CASCADE`
- FK: `edited_by → auth.users(id) ON DELETE SET NULL`

---

### 4.30 — `public.work_category_visibilities`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| work_slug | text | NOT NULL | — | FK → works(slug) ON DELETE CASCADE |
| work_title | text | | | |
| show_in_animes | boolean | NOT NULL | true | |
| show_in_mangas | boolean | NOT NULL | true | |
| show_in_liveaction | boolean | NOT NULL | true | |
| show_in_filmes | boolean | NOT NULL | true | |
| updated_by | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- UNIQUE: `work_slug`
- FK: `work_slug → works(slug) ON DELETE CASCADE`

---

### 4.31 — `public.content_reports`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| reported_by_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| content_type | text | NOT NULL | — | CHECK in (post,comment,reply,profile) |
| reference_id | text | NOT NULL | — | |
| content_preview | text | | | |
| author_id | UUID | | | FK → auth.users(id) ON DELETE SET NULL |
| reason | text | NOT NULL | — | CHECK in (spam,hate_speech,nsfw,harassment,spoiler,misinformation,other) |
| description | text | | | |
| report_status | text | NOT NULL | 'pending' | CHECK in (pending,reviewed,dismissed,actioned) |
| admin_action | text | | | CHECK in (warning,content_removed,user_warned,user_suspended) |
| admin_note | text | | | |
| reviewed_at | timestamptz | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `reported_by_id → auth.users(id) ON DELETE CASCADE`
- FK: `author_id → auth.users(id) ON DELETE SET NULL`

---

### 4.32 — `public.work_suggestions`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| suggested_by_id | UUID | NOT NULL | — | FK → auth.users(id) ON DELETE CASCADE |
| title | text | NOT NULL | — | |
| type | text | NOT NULL | — | CHECK in (anime,manga) |
| mal_id | integer | NOT NULL | — | |
| image_url | text | | | |
| synopsis | text | | | |
| year | integer | | | |
| score | numeric(3,1) | | | |
| status | text | | | |
| episodes | integer | | | |
| chapters | integer | | | |
| genres | text | | | |
| mal_url | text | | | |
| suggestion_status | text | NOT NULL | 'pending' | CHECK in (pending,approved,rejected) |
| admin_note | text | | | |
| reviewed_at | timestamptz | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Constraints:**
- PK: `id`
- FK: `suggested_by_id → auth.users(id) ON DELETE CASCADE`
- CHECK: `type IN ('anime','manga')`
- CHECK: `suggestion_status IN ('pending','approved','rejected')`

---

## 5. PK/FK/CONSTRAINTS SUMMARY

### Foreign Keys (todas)

| Tabela | Coluna | → Target | ON DELETE |
|---|---|---|---|
| profiles | id | auth.users(id) | CASCADE |
| profiles | selected_badge_id | achievements(key) | SET NULL |
| work_releases | work_id | works(id) | CASCADE |
| external_mappings | work_id | works(id) | CASCADE |
| external_mappings | work_release_id | work_releases(id) | CASCADE |
| anime_entries | user_id | auth.users(id) | CASCADE |
| anime_entries | work_id | works(id) | SET NULL |
| anime_entries | release_id | work_releases(id) | SET NULL |
| xp_events | user_id | auth.users(id) | CASCADE |
| xp_events | achievement_id | achievements(key) | SET NULL |
| user_achievements | user_id | auth.users(id) | CASCADE |
| user_achievements | achievement_key | achievements(key) | CASCADE |
| friendships | requester_id | auth.users(id) | CASCADE |
| friendships | receiver_id | auth.users(id) | CASCADE |
| posts | author_id | auth.users(id) | CASCADE |
| posts | community_id | communities(id) | SET NULL |
| post_likes | user_id | auth.users(id) | CASCADE |
| post_likes | post_id | posts(id) | CASCADE |
| comments | post_id | posts(id) | CASCADE |
| comments | parent_id | comments(id) | CASCADE |
| comments | author_id | auth.users(id) | CASCADE |
| comment_likes | user_id | auth.users(id) | CASCADE |
| comment_likes | comment_id | comments(id) | CASCADE |
| direct_messages | sender_id | auth.users(id) | CASCADE |
| direct_messages | receiver_id | auth.users(id) | CASCADE |
| notifications | recipient_id | auth.users(id) | CASCADE |
| notifications | actor_id | auth.users(id) | SET NULL |
| activity_feed | actor_id | auth.users(id) | CASCADE |
| activity_feed | target_id | auth.users(id) | SET NULL |
| communities | creator_id | auth.users(id) | SET NULL |
| community_members | community_id | communities(id) | CASCADE |
| community_members | user_id | auth.users(id) | CASCADE |
| events | organizer_id | auth.users(id) | CASCADE |
| event_participants | event_id | events(id) | CASCADE |
| event_participants | user_id | auth.users(id) | CASCADE |
| event_comments | event_id | events(id) | CASCADE |
| event_comments | author_id | auth.users(id) | CASCADE |
| watch_together | initiator_id | auth.users(id) | CASCADE |
| watch_together | friend_id | auth.users(id) | CASCADE |
| watch_together | work_id | works(id) | SET NULL |
| news | author_id | auth.users(id) | SET NULL |
| fan_art | work_slug | works(slug) | SET NULL |
| card_overrides | work_slug | works(slug) | CASCADE |
| card_overrides | edited_by | auth.users(id) | SET NULL |
| work_category_visibilities | work_slug | works(slug) | CASCADE |
| work_category_visibilities | updated_by | auth.users(id) | SET NULL |
| content_reports | reported_by_id | auth.users(id) | CASCADE |
| content_reports | author_id | auth.users(id) | SET NULL |
| work_suggestions | suggested_by_id | auth.users(id) | CASCADE |
| site_config | updated_by | auth.users(id) | SET NULL |

### Unique Constraints (de negócio)

| Tabela | Constraint |
|---|---|
| profiles | `username` |
| works | `slug` |
| work_releases | `(work_id, slug)` |
| external_mappings | `(provider, provider_id)` |
| anime_entries | `(user_id, release_id)` WHERE release_id IS NOT NULL |
| xp_events | `(user_id, idempotency_key)` |
| user_achievements | `(user_id, achievement_key)` |
| friendships | `LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id)` |
| post_likes | `(user_id, post_id)` |
| comment_likes | `(user_id, comment_id)` |
| community_members | `(community_id, user_id)` |
| event_participants | `(event_id, user_id)` |
| news | `slug` |
| site_config | `label` |
| card_overrides | `(work_slug, category)` |
| work_category_visibilities | `work_slug` |

### Check Constraints

| Tabela | Constraint |
|---|---|
| profiles | `preferred_language IN (...)`, `list_visibility IN (...)`, `profile_visibility IN (...)`, `role IN (...)` |
| work_releases | `category IN (...)`, `status IN (...)`, `sync_status IN (...)` |
| external_mappings | `provider IN (...)`, `work_id IS NOT NULL OR work_release_id IS NOT NULL` |
| anime_entries | `type IN (...)`, `status IN (...)`, `current_episode >= 0`, `current_chapter >= 0`, `rating 1-10` |
| xp_events | `event_type IN (...)` |
| friendships | `requester_id != receiver_id`, `status IN (...)` |
| posts | `post_type IN (...)` |
| notifications | `type IN (...)` |
| activity_feed | `activity_type IN (...)` |
| communities | `category IN (...)` |
| events | `event_type IN (...)`, `media_type IN (...)`, `visibility IN (...)`, `status IN (...)` |
| watch_together | `media_type IN (...)`, `status IN (...)` |
| news | `category IN (...)`, `video_type IN (...)`, `status IN (...)` |
| content_reports | `content_type IN (...)`, `reason IN (...)`, `report_status IN (...)`, `admin_action IN (...)` |
| work_suggestions | `type IN (...)`, `suggestion_status IN (...)` |

---

## 6. RLS MATRIX

| Table | SELECT | INSERT | UPDATE | DELETE | RPC Required? |
|---|---|---|---|---|---|
| profiles | public OR self OR admin | self only (id=auth.uid()) | self only | self only | No |
| works | public | admin | admin | admin | No |
| work_releases | public | admin | admin | admin | No |
| external_mappings | public | admin | admin | admin | No |
| anime_entries | self OR admin | self only | **false** (via RPC) | self OR admin | **Yes** (update_progress) |
| xp_events | self OR admin | **false** | **false** | **false** (admin service role) | **Yes** (grant_xp, update_progress, unlock_achievement) |
| user_achievements | public | **false** | **false** | **false** (admin) | **Yes** (unlock_achievement) |
| achievements | public | admin | admin | admin | No |
| friendships | self (requester/receiver) OR admin | **false** | **false** | **false** | **Yes** (send/accept/reject/cancel/remove) |
| posts | public | self only | self OR admin | self OR admin | No |
| post_likes | public | self only | **false** | self only | No |
| comments | public | self only | self OR admin | self OR admin | No |
| comment_likes | public | self only | **false** | self only | No |
| direct_messages | self (sender/receiver) | self only (sender_id=auth.uid()) | self only (read_at only) | **false** | No |
| notifications | self (recipient) | **false** (via trigger/RPC) | self (read_at only) | self OR admin | Partial (trigger) |
| activity_feed | self (actor/target) OR admin | self only | self only | self only | No |
| communities | public | self only | creator OR admin | creator OR admin | No |
| community_members | public | self only | **false** | self only | No |
| events | public OR self (organizer/participant) OR admin | self only | organizer OR admin | organizer OR admin | No |
| event_participants | public | self only | **false** | self only | No |
| event_comments | public | self only | self OR admin | self OR admin | No |
| watch_together | self (initiator/friend) | self only (initiator) | self (initiator/friend) | self (initiator) | No |
| debates | public | admin | admin | admin | No |
| news | public (status='publicado') OR admin | admin | admin | admin | No |
| fan_art | public (active=true) OR admin | admin | admin | admin | No |
| platform_banners | public (active=true) OR admin | admin | admin | admin | No |
| login_background_images | public (active=true) OR admin | admin | admin | admin | No |
| site_config | public | admin | admin | admin | No |
| card_overrides | public | admin | admin | admin | No |
| work_category_visibilities | public | admin | admin | admin | No |
| content_reports | self (reporter) OR admin | self only | admin | admin | No |
| work_suggestions | self (suggester) OR admin | self only | admin | admin | No |

---

## 7. RPC MATRIX

| RPC | Input | Auth Source | Tables Touched | Transaction | SECURITY DEFINER | Return |
|---|---|---|---|---|---|---|
| `grant_xp` | event_type, source_id | auth.uid() | xp_events (INSERT), anime_entries/posts (SELECT), profiles (UPDATE streak) | Yes | Yes | {status, xp_amount, idempotency_key} |
| `update_progress` | entry_id, action, value | auth.uid() | anime_entries (SELECT/UPDATE), work_releases (SELECT), xp_events (INSERT), profiles (UPDATE) | Yes | Yes | {status, progress, xp_granted, completed, status_changed} |
| `unlock_achievement` | achievement_id | auth.uid() | user_achievements (SELECT/INSERT), xp_events (INSERT), anime_entries/posts/friendships/events/communities (SELECT), profiles (UPDATE) | Yes | Yes | {status, xp_amount, achievement_id} |
| `send_friend_request` | receiver_id | auth.uid() | friendships (INSERT) | Yes | Yes | {status, friendship_id} |
| `accept_friend_request` | friendship_id | auth.uid() | friendships (UPDATE), notifications (INSERT) | Yes | Yes | {status} |
| `reject_friend_request` | friendship_id | auth.uid() | friendships (UPDATE/DELETE) | Yes | Yes | {status} |
| `cancel_friend_request` | friendship_id | auth.uid() | friendships (DELETE) | Yes | Yes | {status} |
| `remove_friend` | friendship_id | auth.uid() | friendships (DELETE) | Yes | Yes | {status} |

### Detalhes de RPCs críticos

#### `update_progress`
```
Input: entry_id UUID, action TEXT (increment|decrement|set_progress|complete), value INTEGER
Auth: auth.uid() = entry.user_id
Transaction:
  1. SELECT anime_entry WHERE id = entry_id AND user_id = auth.uid()
  2. SELECT work_release (canonical total, airing status)
  3. Compute new_progress
  4. UPDATE anime_entry SET current_episode/chapter, status
  5. FOR n IN old+1..new: INSERT xp_events (episode_watched/chapter_read) ON CONFLICT DO NOTHING
  6. IF completed: INSERT xp_events (work_completed) ON CONFLICT DO NOTHING
  7. IF xp_granted > 0: UPDATE profiles SET streak
Return: {status, progress, xp_granted, completion_xp, completed, status_changed}
```

#### `send_friend_request`
```
Input: receiver_id UUID
Auth: auth.uid() = requester_id
Transaction:
  1. CHECK requester_id != receiver_id
  2. INSERT friendships (requester_id=auth.uid(), receiver_id, status='pending')
     ON CONFLICT (LEAST/GREATEST pair) DO NOTHING
  3. INSERT notification (recipient_id=receiver_id, type='friend_request')
Return: {status, friendship_id}
```

#### `accept_friend_request`
```
Input: friendship_id UUID
Auth: auth.uid() = receiver_id
Transaction:
  1. UPDATE friendships SET status='accepted' WHERE id=friendship_id AND receiver_id=auth.uid()
  2. INSERT notification (recipient_id=requester_id, type='friend_accepted')
Return: {status}
```

---

## 8. EDGE FUNCTION MATRIX

| Edge Function | Trigger | Auth | External API | Purpose |
|---|---|---|---|---|
| `anilist-catalog-sync` | HTTP POST (admin) | admin JWT | AniList GraphQL | Sync work_releases com AniList |
| `mal-catalog-sync` | HTTP POST (admin) | admin JWT | Jikan REST | Sync work_releases com MAL |

### RPC vs Edge Function — Critério

| Critério | RPC PostgreSQL | Edge Function |
|---|---|---|
| Operação puramente banco | ✅ | ❌ |
| Transacional multi-tabela | ✅ | ❌ |
| Chama API externa | ❌ | ✅ |
| Scheduled/cron | ❌ | ✅ (com pg_cron ou Supabase scheduler) |
| Validação server-side de regras | ✅ | ✅ |

**Decisão:**
- `grant_xp`, `update_progress`, `unlock_achievement` → **RPC** (transacional, banco-only)
- `send/accept/reject/cancel/remove_friend` → **RPC** (transacional, banco-only)
- `anilistCatalogSync`, `malCatalogSync` → **Edge Function** (chama API externa, não-transacional)

---

## 9. STORAGE PLAN

### Buckets Sugeridos

| Bucket | Visibility | Path Convention | Owner | Content |
|---|---|---|---|---|
| `avatars` | public | `{user_id}/avatar.jpg` | user (self) | Profile avatars |
| `profile-banners` | public | `{user_id}/banner.jpg` | user (self) | Profile banners |
| `post-images` | public | `{user_id}/{post_id}.jpg` | user (self) | Post images |
| `fan-art` | public | `{fan_art_id}.jpg` | admin | Fan art images |
| `news` | public | `{news_id}/{type}.jpg` | admin | News images (banner/card/article) |
| `site-assets` | public | `logos/`, `sounds/`, `banners/` | admin | Logos, sounds, platform banners |

### Storage RLS Policies

| Bucket | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| avatars | public | self only (path = `{auth.uid()}/`) | self only | self only |
| profile-banners | public | self only | self only | self only |
| post-images | public | self only | self only | self only |
| fan-art | public | admin only | admin only | admin only |
| news | public | admin only | admin only | admin only |
| site-assets | public | admin only | admin only | admin only |

### Mapeamento UploadFile → Storage

| Call Site Atual | Bucket Target |
|---|---|
| EditProfileDialog (avatar/banner) | avatars / profile-banners |
| ProfileSetup (avatar/banner) | avatars / profile-banners |
| CreatePostCard (post image) | post-images |
| NewsEditor/ImageUploadField (news images) | news |
| AdminEditCardModal (card override image) | site-assets |
| AppearanceManager (logos, sounds) | site-assets |
| LoginImagesPanel (login backgrounds) | site-assets |
| Communities/CommunityPage (community avatar/cover) | site-assets |
| SoundUploader (achievement sound) | site-assets |
| CatalogManager (media cover) | site-assets |

---

## 10. AUTH MIGRATION

### Base44 Auth → Supabase Auth

| Base44 | Supabase |
|---|---|
| `base44.auth.loginViaEmailPassword(email, password)` | `supabase.auth.signInWithPassword({email, password})` |
| `base44.auth.register({email, password})` | `supabase.auth.signUp({email, password})` |
| `base44.auth.verifyOtp({email, otpCode})` | `supabase.auth.verifyOtp({email, token, type:'signup'})` |
| `base44.auth.loginWithProvider('google')` | `supabase.auth.signInWithOAuth({provider:'google'})` |
| `base44.auth.resetPasswordRequest(email)` | `supabase.auth.resetPasswordForEmail(email)` |
| `base44.auth.resetPassword({resetToken, newPassword})` | `supabase.auth.updateUser({password})` (após redirect) |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.auth.me()` | `supabase.auth.getUser()` + `supabase.rpc('get_my_profile')` (contrato de perfil endurecido em 20260920010000) |
| `base44.auth.isAuthenticated()` | `supabase.auth.getSession()` → not null |
| `base44.auth.updateMe(data)` | `supabase.rpc('update_profile', { p_updates: data })`; mídia via set/remove_avatar e set/remove_banner |

### Componentes de Auth

| Componente Base44 | Equivalente Supabase |
|---|---|
| `ProtectedRoute` | Permanece — checa `supabase.auth.getSession()` em vez de `base44.auth.isAuthenticated()` |
| `ProfileSetupGate` | Permanece — checa `profiles.profile_setup_completed` |
| `AuthContext` | Refatorar para usar `supabase.auth.onAuthStateChange()` listener |
| `Login.jsx` | Atualizar SDK calls |
| `Register.jsx` | Atualizar SDK calls (signUp → OTP → verifyOtp) |
| `ForgotPassword.jsx` | Atualizar para `resetPasswordForEmail` |
| `ResetPassword.jsx` | Atualizar para `updateUser({password})` |

### Apple
- **Permanece desativado** (não habilitar no Supabase).

### Google
- Configurar Google OAuth no Supabase Auth dashboard.
- `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo}})`.

---

## 11. INDEX PLAN

### Indexes Recomendados

| Table | Index | Columns | Type | Purpose |
|---|---|---|---|---|
| profiles | idx_profiles_username | username | btree | busca por username |
| works | idx_works_slug | slug | btree | lookup por slug |
| works | idx_works_franchise_id | franchise_id | btree | queries de franchise |
| works | idx_works_trending | is_trending | partial | WHERE is_trending=true |
| work_releases | idx_wr_work_id | work_id | btree | releases por work |
| work_releases | idx_wr_category | category | btree | filtro de categoria |
| work_releases | idx_wr_trending | trending_rank | partial | WHERE trending_rank IS NOT NULL |
| external_mappings | idx_em_provider | (provider, provider_id) | btree | lookup por provider ID |
| external_mappings | idx_em_work_id | work_id | btree | mappings por work |
| anime_entries | idx_ae_user_id | user_id | btree | entries por user |
| anime_entries | idx_ae_release_id | release_id | btree | entries por release |
| anime_entries | idx_ae_user_release | (user_id, release_id) | unique partial | WHERE release_id IS NOT NULL |
| xp_events | idx_xp_user_created | (user_id, created_at DESC) | btree | ranking por período |
| xp_events | idx_xp_idempotency | (user_id, idempotency_key) | unique | atomicidade |
| user_achievements | idx_ua_user_id | user_id | btree | achievements por user |
| friendships | idx_fs_requester | requester_id | btree | requests enviados |
| friendships | idx_fs_receiver | receiver_id | btree | requests recebidos |
| friendships | idx_fs_unique_pair | (LEAST, GREATEST) | unique expression | anti-duplicação |
| posts | idx_posts_author | author_id | btree | posts por autor |
| posts | idx_posts_community | community_id | btree | posts por comunidade |
| posts | idx_posts_created | created_at DESC | btree | feed cronológico |
| post_likes | idx_pl_post_id | post_id | btree | likes por post |
| comments | idx_comments_post | (post_id, created_at) | btree | comentários por post |
| comments | idx_comments_parent | parent_id | btree | threaded replies |
| direct_messages | idx_dm_conversation | (LEAST, GREATEST, created_at) | btree | query de conversa |
| notifications | idx_notif_recipient | (recipient_id, read_at, created_at DESC) | btree | unread first |
| notifications | idx_notif_unread | recipient_id | partial | WHERE read_at IS NULL |
| communities | idx_comm_category | category | btree | filtro por categoria |
| community_members | idx_cm_user_id | user_id | btree | comunidades por user |
| events | idx_events_date | event_date | btree | eventos por data |
| events | idx_events_organizer | organizer_id | btree | eventos por organizer |
| news | idx_news_slug | slug | btree | lookup por slug |
| news | idx_news_published | published_at DESC | partial | WHERE status='publicado' |
| content_reports | idx_reports_status | report_status | btree | filtro admin |
| work_suggestions | idx_sugg_status | suggestion_status | btree | filtro admin |

---

## 12. DATA CLASSIFICATION

| Dataset | Action | Reason |
|---|---|---|
| Users (auth) | MIGRATE | Usuários reais devem preservar acesso |
| Profiles | MIGRATE | Dados de perfil vinculados a users |
| Catalog (works) | MIGRATE | Catálogo curado, dados reais |
| WorkReleases | MIGRATE | Catálogo curado, dados reais |
| ExternalMappings | MIGRATE | Identidade canônica de sync |
| CardOverrides | MIGRATE | Overrides admin, dados reais |
| WorkCategoryVisibilities | MIGRATE | Config ANIME_ONLY |
| Achievements | MIGRATE | Catálogo estático |
| News | MIGRATE | Conteúdo editorial |
| FanArt | MIGRATE | Conteúdo editorial |
| PlatformBanners | MIGRATE | Conteúdo editorial |
| LoginBackgroundImages | MIGRATE | Conteúdo editorial |
| SiteConfig | MIGRATE | Config do site |
| Debates | MIGRATE | Conteúdo editorial admin |
| AnimeEntry | RESET | Progresso de usuário = dado de teste |
| XpEvent | RESET | XP de teste |
| UserAchievement | RESET | Conquistas de teste |
| Friendship | RESET | Amizades de teste |
| DirectMessage | RESET | Mensagens de teste |
| Notification | RESET | Notificações de teste |
| ActivityFeed | RESET | Atividade de teste |
| WatchTogether | RESET | Dados de teste |
| SocialEvent | RESET | Eventos de teste |
| EventComment | RESET | Comentários de teste |
| Community | RESET | Comunidades de teste |
| Post | RESET | Posts de teste |
| Comment | RESET | Comentários de teste |
| ContentReport | RESET | Reports de teste |
| WorkSuggestion | RESET | Sugestões de teste |
| SyncRun | DISCARD | Histórico de sync não necessário |
| SyncLog | DISCARD | Histórico de sync não necessário |
| SyncConflict | DISCARD | Conflitos antigos irrelevantes |
| CatalogSync | DISCARD | Legado, substituído |
| MediaWork | DISCARD | Legado, substituído |

### Summary
- **MIGRATE:** 14 datasets
- **RESET:** 15 datasets
- **DISCARD:** 5 datasets

---

## 13. BASE44 → SUPABASE FIELD MAPPING

### Padrão de transformação: email → UUID

| Base44 Field Pattern | Supabase Column | Transformation |
|---|---|---|
| `user_email: string` | `user_id: UUID` | Resolve email → auth.users.id |
| `created_by: string (email)` | `user_id: UUID` ou mantido como metadata | Resolve email → auth.users.id |
| `requester_email: string` | `requester_id: UUID` | Resolve email → auth.users.id |
| `receiver_email: string` | `receiver_id: UUID` | Resolve email → auth.users.id |
| `sender_email: string` | `sender_id: UUID` | Resolve email → auth.users.id |
| `recipient_email: string` | `recipient_id: UUID` | Resolve email → auth.users.id |
| `actor_email: string` | `actor_id: UUID` | Resolve email → auth.users.id |
| `target_email: string` | `target_id: UUID` | Resolve email → auth.users.id |
| `initiator_email: string` | `initiator_id: UUID` | Resolve email → auth.users.id |
| `friend_email: string` | `friend_id: UUID` | Resolve email → auth.users.id |
| `organizer_email: string` | `organizer_id: UUID` | Resolve email → auth.users.id |
| `creator_email: string` | `creator_id: UUID` | Resolve email → auth.users.id |
| `author_email: string` | `author_id: UUID` | Resolve email → auth.users.id |
| `reported_by_email: string` | `reported_by_id: UUID` | Resolve email → auth.users.id |
| `suggested_by_email: string` | `suggested_by_id: UUID` | Resolve email → auth.users.id |
| `from_email: string` | `actor_id: UUID` | Resolve email → auth.users.id |

### Padrão: arrays → junction tables

| Base44 Array Field | Supabase Junction Table |
|---|---|
| `Community.members[]` | `community_members` |
| `SocialEvent.participants[]` | `event_participants` |
| `Post.liked_by[]` | `post_likes` |
| `Comment.liked_by[]` | `comment_likes` |

### Padrão: counters → triggers

| Base44 Counter Field | Supabase Approach |
|---|---|
| `Post.likes_count` | Trigger on `post_likes` INSERT/DELETE |
| `Post.comments_count` | Trigger on `comments` INSERT/DELETE |
| `Comment.likes_count` | Trigger on `comment_likes` INSERT/DELETE |
| `Community.members_count` | Trigger on `community_members` INSERT/DELETE |
| `WorkRelease.release_count` (denormalizado em works) | Trigger on `work_releases` INSERT/DELETE |

### Padrão: timestamps

| Base44 | Supabase |
|---|---|
| `created_date: string (ISO)` | `created_at: timestamptz DEFAULT now()` |
| `updated_date: string (ISO)` | `updated_at: timestamptz DEFAULT now()` (trigger) |
| `event_date: string (date-time)` | `created_at: timestamptz` |
| `unlocked_at: string (date-time)` | `unlocked_at: timestamptz DEFAULT now()` |
| `published_at: string (date-time)` | `published_at: timestamptz` |
| `is_read: boolean` | `read_at: timestamptz` (NULL = não lida) |

### Padrão: IDs

| Base44 | Supabase |
|---|---|
| `id: string (MongoDB ObjectId 24-char hex)` | `id: UUID DEFAULT gen_random_uuid()` |
| `group_id: string` | `work_id: UUID` |
| `release_id: string` | `release_id: UUID` |
| `post_id: string` | `post_id: UUID` |
| `event_id: string` | `event_id: UUID` |
| `community_id: string` | `community_id: UUID` |

### Padrão: campos legados descartados

| Base44 Field | Reason |
|---|---|
| `AnimeEntry.season_mal_id` | Substituído por `release_id` |
| `DynamicWork.seasons[]` | Migrado para `work_releases` |
| `DynamicWork.episodes/chapters/volumes` | Movidos para `work_releases` |
| `DynamicWork.anime_status/manga_status` | Movidos para `work_releases.status` |
| `DynamicWork.mal_id/manga_mal_id` | Movidos para `external_mappings` |
| `DynamicWork.image_url/duration/source/popularity_rank` | Movidos/descartados |
| `News.image_url` | Substituído por banner/card/article_image_url |
| `News.source_url/source_name` | Substituído por `sources[]` |
| `CatalogSync.*` | Entidade descartada |
| `MediaWork.*` | Entidade descartada |
| `SyncRun/SyncLog/SyncConflict.*` | Descartados |

---

## 14. TABLE CREATION ORDER

### Ordem respeitando FKs (dependências)

1. `auth.users` (nativo Supabase — já existe)
2. `public.achievements` (sem FKs)
3. `public.profiles` (FK → auth.users, achievements)
4. `public.works` (self-FK franchise_id — criar sem FK primeiro, adicionar depois)
5. `public.work_releases` (FK → works)
6. `public.external_mappings` (FK → works, work_releases)
7. `public.anime_entries` (FK → auth.users, works, work_releases)
8. `public.xp_events` (FK → auth.users, achievements)
9. `public.user_achievements` (FK → auth.users, achievements)
10. `public.communities` (FK → auth.users)
11. `public.community_members` (FK → communities, auth.users)
12. `public.posts` (FK → auth.users, communities)
13. `public.post_likes` (FK → auth.users, posts)
14. `public.comments` (FK → posts, comments self-ref, auth.users)
15. `public.comment_likes` (FK → auth.users, comments)
16. `public.friendships` (FK → auth.users)
17. `public.direct_messages` (FK → auth.users)
18. `public.notifications` (FK → auth.users)
19. `public.activity_feed` (FK → auth.users)
20. `public.events` (FK → auth.users)
21. `public.event_participants` (FK → events, auth.users)
22. `public.event_comments` (FK → events, auth.users)
23. `public.watch_together` (FK → auth.users, works)
24. `public.debates` (sem FKs)
25. `public.news` (FK → auth.users)
26. `public.fan_art` (FK → works.slug)
27. `public.platform_banners` (sem FKs)
28. `public.login_background_images` (sem FKs)
29. `public.site_config` (FK → auth.users)
30. `public.card_overrides` (FK → works.slug, auth.users)
31. `public.work_category_visibilities` (FK → works.slug, auth.users)
32. `public.content_reports` (FK → auth.users)
33. `public.work_suggestions` (FK → auth.users)

### Passos pós-criação
34. Adicionar FK self-reference: `works.franchise_id → works(id)`
35. Criar unique expression index: `friendships(LEAST, GREATEST)`
36. Criar partial unique index: `anime_entries(user_id, release_id) WHERE release_id IS NOT NULL`
37. Criar triggers: `updated_at`, counters (likes, comments, members), denormalização (author_name, etc.)
38. Criar RLS policies (todas as tabelas)
39. Criar RPCs (8 funções SECURITY DEFINER)
40. Criar buckets Storage + policies
41. Configurar Auth providers (Google)

---

## 15. DATA IMPORT ORDER

### Pré-requisito
- Tabelas criadas
- RLS desativada temporariamente para import
- auth.users já migrados (via Supabase Auth import ou script)

### Ordem de import (respeitando FKs)

1. `auth.users` — importar usuários (email, password hash se disponível)
2. `profiles` — importar de UserProfile (user_email → user_id resolution)
3. `achievements` — importar catálogo estático
4. `works` — importar de DynamicWork (franchise_id → self-FK, seasons[] descartado)
5. `work_releases` — importar de WorkRelease (group_id → work_id)
6. `external_mappings` — importar de ExternalMapping (work_group_id → work_id, work_release_id → release_id)
7. `card_overrides` — importar de CardOverride
8. `work_category_visibilities` — importar de WorkCategoryVisibility
9. `news` — importar de News (author_id → user_id, campos legados descartados)
10. `fan_art` — importar de FanArt (work_slug → FK)
11. `platform_banners` — importar de PlatformBanner
12. `login_background_images` — importar de LoginBackgroundImage
13. `site_config` — importar de SiteConfig
14. `debates` — importar de Debate

### Tabelas RESET (não importar dados)
- anime_entries, xp_events, user_achievements, friendships, direct_messages, notifications, activity_feed, watch_together, events, event_participants, event_comments, communities, community_members, posts, post_likes, comments, comment_likes, content_reports, work_suggestions

### Tabelas DISCARD (não criar)
- sync_runs, sync_logs, sync_conflicts, catalog_sync, media_work

---

## 16. KNOWN MIGRATION RISKS

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Email → UUID resolution** | Users sem auth.users.id correspondente quebram FKs | Pré-migrar todos os users para auth.users antes de importar dados |
| 2 | **DynamicWork.seasons[] → work_releases** | Dados JSON complexos, possível perda | Script de transformação cuidadoso; validar 714 DW sem WR |
| 3 | **110 AnimeEntry sem release_id** | Entries legacy não têm FK para work_releases | Permitir release_id NULL; backfill futuro |
| 4 | **102 DynamicWork com slugs duplicados** | Viola UNIQUE(slug) | Deduplicação antes do import |
| 5 | **Counter drift** | likes_count/comments_count podem dessincronizar | Triggers garantem consistência; validar pós-import |
| 6 | **RLS break durante import** | FKs podem falhar se RLS ativa | Desativar RLS durante import, reativar depois |
| 7 | **Password migration** | Base44 não expõe password hashes | Usuários precisam resetar senha (ou manter Base44 auth temporariamente) |
| 8 | **Realtime subscriptions** | `base44.entities.X.subscribe()` → `supabase.channel()` | Refatorar todos os call sites de subscribe |
| 9 | **AniList 403 de datacenter** | Edge Functions rodam em datacenter | Usar proxy ou rodar de frontend; confirmar com Supabase |
| 10 | **Friendship unique pair** | Expression index `LEAST/GREATEST` pode ter edge cases | Testar com dados reais antes de produção |
| 11 | **auth.users.id não é string** | Base44 ObjectId (24 hex) vs UUID | Transformação de ID em todas as FKs |
| 12 | **Polymorphic references** | `reference_id` string → `reference_type` + `reference_id` | Não há FK real; validar no app |

---

## 17. DECISIONS REQUIRING CONFIRMATION

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | **Password migration strategy** | (a) Force reset all passwords, (b) Dual-auth temporário Base44+Supabase | (a) — mais limpo |
| 2 | **works.franchise_id self-FK** | (a) Self-FK com ON DELETE SET NULL, (b) Remover campo | (a) — preserva hierarquia |
| 3 | **Counter approach** | (a) Triggers, (b) Views derivadas, (c) Hybrid | (a) triggers — performance + consistência |
| 4 | **direct_messages.update** | (a) Column-level RLS (read_at only), (b) Trigger de validação | (a) — mais limpo se Supabase suportar |
| 5 | **Sync tables** | (a) Descartar todas, (b) Recriar sync_runs vazia | (a) — começa limpo |
| 6 | **ANIME_ONLY** | (a) Config em site_config, (b) Tabela work_category_visibilities, (c) Ambos | (c) — visibilidade por obra + flag global |
| 7 | **XP legacy_migration** | (a) Descartar (RESET), (b) Migrar baselines | (a) — dados de teste |
| 8 | **Edge Function runtime** | (a) Supabase Deno Edge Functions, (b) External service | (a) — nativo |
| 9 | **Storage bucket granularity** | (a) 6 buckets como proposto, (b) Buckets mais granulares | (a) — suficiente |
| 10 | **news.author_id** | (a) FK → auth.users, (b) Manter como string | (a) — integridade |
| 11 | **activity_feed.target_id** | (a) FK → auth.users, (b) Remover (nem sempre há target) | (a) com SET NULL |
| 12 | **watch_together.work_id** | (a) FK → works, (b) Manter media_title string | (a) quando possível, (b) fallback |

---

## 18. RECOMMENDED NEXT STEP

Após confirmação das decisões acima:

1. **Confirmar decisões pendentes** (seção 17) com o time
2. **Criar projeto Supabase** e configurar Auth (Google)
3. **Escrever SQL migrations** na ordem da seção 14:
   - 001: tabelas base (achievements, profiles, works, work_releases, external_mappings)
   - 002: tabelas de progress (anime_entries, xp_events, user_achievements)
   - 003: tabelas sociais (friendships, direct_messages, notifications, activity_feed)
   - 004: tabelas de conteúdo (communities, posts, comments, events, etc.)
   - 005: tabelas editoriais (news, fan_art, banners, config)
   - 006: junction tables (post_likes, comment_likes, community_members, event_participants)
   - 007: constraints, indexes, triggers
   - 008: RLS policies
   - 009: RPCs (SECURITY DEFINER)
   - 010: Storage buckets + policies
4. **Escrever script de import** de dados (MIGRATE datasets only)
5. **Escrever Edge Functions** (anilist-catalog-sync, mal-catalog-sync)
6. **Refatorar frontend** para usar Supabase client (substituir todos os `base44.*` calls)
7. **Testar end-to-end** antes de desativar Base44

---

**FIM DO DOCUMENTO — FASE 2**
