# Supabase Migration Manifest

**Data:** 2026-09-07
**Origem:** Base44 (MongoDB-like, RLS via JSON config)
**Destino:** Lovable + Supabase (Postgres, RLS via SQL policies)

---

## A. TABELAS SUPABASE FUTURAS

### A.1 Catálogo

| Entidade Base44 | Tabela Supabase | Notas |
|----------------|-----------------|-------|
| DynamicWork | `dynamic_works` | Franchise-mãe. Preservar `id` como `uuid`. |
| WorkRelease | `work_releases` | Temporada/edição. FK → `dynamic_works(id)`. |
| ExternalMapping | `external_mappings` | Identidade externa. FK → `dynamic_works(id)` e/ou `work_releases(id)`. |
| CatalogSync | `catalog_sync` | Sync legado por slug. Pode ser deprecated pós-migração. |
| MediaWork | `media_works` | Obras estáticas legado. Avaliar depreciação. |
| CardOverride | `card_overrides` | Overrides de card por categoria. |
| WorkCategoryVisibility | `work_category_visibilities` | Visibilidade por categoria. |

### A.2 Usuário e Progresso

| Entidade Base44 | Tabela Supabase | Notas |
|----------------|-----------------|-------|
| User | `auth.users` (built-in Supabase) | Migrar via `supabase.auth.admin.createUser()`. Preservar email. |
| UserProfile | `user_profiles` | 1:1 com `auth.users` via `user_email` (ou `user_id` pós-migração). |
| AnimeEntry | `anime_entries` | Lista pessoal. FK → `auth.users(id)` e `work_releases(id)`. |
| UserAchievement | `user_achievements` | FK → `auth.users(id)` e `achievements(key)`. |
| XpEvent | `xp_events` | Histórico de XP. FK → `auth.users(id)`. |

### A.3 Sincronização

| Entidade Base44 | Tabela Supabase | Notas |
|----------------|-----------------|-------|
| SyncRun | `sync_runs` | Admin-only. |
| SyncLog | `sync_logs` | FK → `sync_runs(run_id)`. |
| SyncConflict | `sync_conflicts` | Admin-only. |

### A.4 Social

| Entidade Base44 | Tabela Supabase | Notas |
|----------------|-----------------|-------|
| Friendship | `friendships` | FK → `auth.users(id)` (requester, receiver). |
| Post | `posts` | FK → `auth.users(id)` (author), `communities(id)` (nullable). |
| Comment | `comments` | FK → `posts(id)`, `comments(id)` (self-ref para replies). |
| Community | `communities` | FK → `auth.users(id)` (creator). |
| SocialEvent | `social_events` | FK → `auth.users(id)` (organizer). |
| EventComment | `event_comments` | FK → `social_events(id)`, `auth.users(id)`. |
| WatchTogether | `watch_togethers` | FK → `auth.users(id)` (initiator, friend). |
| DirectMessage | `direct_messages` | FK → `auth.users(id)` (sender, receiver). |
| Notification | `notifications` | FK → `auth.users(id)` (recipient). |
| ActivityFeed | `activity_feed` | FK → `auth.users(id)` (actor, target). |
| Debate | `debates` | Admin-only create. |

### A.5 CMS / Admin

| Entidade Base44 | Tabela Supabase | Notas |
|----------------|-----------------|-------|
| News | `news` | Slug único. |
| Achievement | `achievements` | Definições (key única). |
| FanArt | `fan_arts` | Arte de fãs. |
| PlatformBanner | `platform_banners` | Banners promocionais. |
| LoginBackgroundImage | `login_background_images` | Imagens de fundo do login. |
| SiteConfig | `site_config` | Configuração do site (label único). |
| WorkSuggestion | `work_suggestions` | Sugestões de obras. |
| ContentReport | `content_reports` | Moderação. |

---

## B. IDs — PRESERVAÇÃO

### Princípio

**Preservar os IDs atuais sempre que tecnicamente possível.**

### Estratégia

| Entidade | ID Atual (Base44) | ID Supabase | Estratégia |
|----------|-------------------|-------------|------------|
| DynamicWork | String (UUID-like) | `uuid` | Preservar como `id` (uuid). Inserir com ID explícito. |
| WorkRelease | String (UUID-like) | `uuid` | Preservar como `id`. |
| ExternalMapping | String (UUID-like) | `uuid` | Preservar como `id`. |
| AnimeEntry | String (UUID-like) | `uuid` | Preservar como `id`. |
| SyncRun | String (UUID-like) | `uuid` | Preservar. |
| SyncLog | String (UUID-like) | `uuid` | Preservar. |
| UserProfile | String (UUID-like) | `uuid` | Preservar. Adicionar `user_id uuid` FK para `auth.users(id)`. |
| User | String (Base44 internal) | `uuid` (Supabase auth) | **NÃO preservável** — recriar via `createUser()`, mapear email → novo ID. |
| Social entities | String (UUID-like) | `uuid` | Preservar como `id`. |

### Mapeamento User → auth.users

Como User é built-in no Base44 e não pode ser exportado diretamente:
1. Exportar lista de emails dos usuários atuais (via Base44 dashboard ou API).
2. Recriar cada usuário no Supabase Auth via `supabase.auth.admin.createUser({ email })`.
3. Criar tabela de mapeamento `user_id_mapping(base44_id, supabase_uuid, email)`.
4. Atualizar todas as FKs que referenciam `created_by_id` ou `user_email` para o novo `auth.users.id`.

### Campos de referência

| Campo Atual | Referencia | Pós-Migração |
|-------------|-----------|--------------|
| `created_by_id` (Base44 auto) | User ID | `created_by uuid FK → auth.users(id)` |
| `user_email` (UserProfile) | User email | Manter `user_email text` + adicionar `user_id uuid FK` |
| `recipient_email` (Notification) | User email | Manter `recipient_email` + adicionar `recipient_id uuid` |
| `organizer_email` (SocialEvent) | User email | Manter + adicionar `organizer_id uuid` |
| `requester_email` / `receiver_email` (Friendship) | User email | Manter + adicionar FKs uuid |
| `sender_email` / `receiver_email` (DirectMessage) | User email | Manter + adicionar FKs uuid |
| `author_email` (EventComment) | User email | Manter + adicionar `author_id uuid` |
| `initiator_email` / `friend_email` (WatchTogether) | User email | Manter + adicionar FKs uuid |
| `actor_email` / `target_email` (ActivityFeed) | User email | Manter + adicionar FKs uuid |
| `release_id` (AnimeEntry) | WorkRelease ID | `release_id uuid FK → work_releases(id)` — preservar valor |
| `group_id` (WorkRelease) | DynamicWork ID | `group_id uuid FK → dynamic_works(id)` — preservar valor |
| `work_release_id` (ExternalMapping) | WorkRelease ID | `work_release_id uuid FK → work_releases(id)` |
| `work_group_id` (ExternalMapping) | DynamicWork ID | `work_group_id uuid FK → dynamic_works(id)` |
| `run_id` (SyncLog → SyncRun) | SyncRun.run_id | `run_id text FK → sync_runs(run_id)` (não é o PK) |
| `community_id` (Post) | Community ID | `community_id uuid FK → communities(id)` |
| `post_id` (Comment) | Post ID | `post_id uuid FK → posts(id)` |
| `parent_id` (Comment) | Comment ID | `parent_id uuid FK → comments(id)` (self-ref) |
| `event_id` (EventComment) | SocialEvent ID | `event_id uuid FK → social_events(id)` |

---

## C. RELACIONAMENTOS (FOREIGN KEYS)

### C.1 Catálogo

```sql
-- work_releases → dynamic_works
ALTER TABLE work_releases ADD CONSTRAINT fk_wr_group
  FOREIGN KEY (group_id) REFERENCES dynamic_works(id) ON DELETE CASCADE;

-- external_mappings → dynamic_works (nullable)
ALTER TABLE external_mappings ADD CONSTRAINT fk_em_group
  FOREIGN KEY (work_group_id) REFERENCES dynamic_works(id) ON DELETE SET NULL;

-- external_mappings → work_releases (nullable)
ALTER TABLE external_mappings ADD CONSTRAINT fk_em_release
  FOREIGN KEY (work_release_id) REFERENCES work_releases(id) ON DELETE SET NULL;
```

### C.2 Usuário e Progresso

```sql
-- user_profiles → auth.users
ALTER TABLE user_profiles ADD CONSTRAINT fk_up_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- anime_entries → auth.users
ALTER TABLE anime_entries ADD CONSTRAINT fk_ae_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- anime_entries → work_releases (nullable)
ALTER TABLE anime_entries ADD CONSTRAINT fk_ae_release
  FOREIGN KEY (release_id) REFERENCES work_releases(id) ON DELETE SET NULL;

-- user_achievements → auth.users
ALTER TABLE user_achievements ADD CONSTRAINT fk_ua_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_achievements → achievements
ALTER TABLE user_achievements ADD CONSTRAINT fk_ua_achievement
  FOREIGN KEY (achievement_key) REFERENCES achievements(key) ON DELETE CASCADE;

-- xp_events → auth.users
ALTER TABLE xp_events ADD CONSTRAINT fk_xe_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### C.3 Sincronização

```sql
-- sync_logs → sync_runs
ALTER TABLE sync_logs ADD CONSTRAINT fk_sl_run
  FOREIGN KEY (run_id) REFERENCES sync_runs(run_id) ON DELETE CASCADE;
```

### C.4 Social

```sql
-- friendships → auth.users (requester, receiver)
ALTER TABLE friendships ADD CONSTRAINT fk_f_requester
  FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE friendships ADD CONSTRAINT fk_f_receiver
  FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- posts → auth.users (author)
ALTER TABLE posts ADD CONSTRAINT fk_p_author
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- posts → communities (nullable)
ALTER TABLE posts ADD CONSTRAINT fk_p_community
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL;

-- comments → posts
ALTER TABLE comments ADD CONSTRAINT fk_c_post
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- comments → comments (self-ref, nullable)
ALTER TABLE comments ADD CONSTRAINT fk_c_parent
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;

-- communities → auth.users (creator)
ALTER TABLE communities ADD CONSTRAINT fk_com_creator
  FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- social_events → auth.users (organizer)
ALTER TABLE social_events ADD CONSTRAINT fk_se_organizer
  FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- event_comments → social_events
ALTER TABLE event_comments ADD CONSTRAINT fk_ec_event
  FOREIGN KEY (event_id) REFERENCES social_events(id) ON DELETE CASCADE;

-- event_comments → auth.users
ALTER TABLE event_comments ADD CONSTRAINT fk_ec_author
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- watch_togethers → auth.users (initiator, friend)
ALTER TABLE watch_togethers ADD CONSTRAINT fk_wt_initiator
  FOREIGN KEY (initiator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE watch_togethers ADD CONSTRAINT fk_wt_friend
  FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- direct_messages → auth.users (sender, receiver)
ALTER TABLE direct_messages ADD CONSTRAINT fk_dm_sender
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE direct_messages ADD CONSTRAINT fk_dm_receiver
  FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- notifications → auth.users (recipient)
ALTER TABLE notifications ADD CONSTRAINT fk_n_recipient
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- activity_feed → auth.users (actor, target)
ALTER TABLE activity_feed ADD CONSTRAINT fk_af_actor
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE activity_feed ADD CONSTRAINT fk_af_target
  FOREIGN KEY (target_id) REFERENCES auth.users(id) ON DELETE SET NULL;
```

---

## D. JSON STRINGS → JSONB / ARRAYS / TABELAS RELACIONADAS

### D.1 Campos JSON String atuais → jsonb

| Entidade | Campo Atual | Tipo Atual | Tipo Supabase | Notas |
|----------|-------------|-----------|---------------|-------|
| DynamicWork | `categories` | JSON string `'["anime"]'` | `jsonb` | Array de categorias. |
| DynamicWork | `genres` | JSON string | `jsonb` | Array de gêneros. |
| DynamicWork | `seasons` | JSON string (legacy) | `jsonb` | Array de temporadas legado. **Avaliar depreciação** — WorkRelease é canônico. |
| SyncRun | `processed_release_ids` | JSON string `'["id1","id2"]'` | `jsonb` | Array de IDs processados. |
| SyncRun | `errors` | JSON string | `jsonb` | Array de erros. |
| SyncRun | `summary` | JSON string | `jsonb` | Objeto de resumo. |
| SyncLog | `proposed_fields` | JSON string | `jsonb` | Array de campos propostos. |
| SyncLog | `written_fields` | JSON string | `jsonb` | Array de campos escritos. |
| SyncLog | `reviews` | JSON string | `jsonb` | Array de reviews. |
| SyncLog | `ignored` | JSON string | `jsonb` | Array de campos ignorados. |
| SyncLog | `dw_updates` | JSON string | `jsonb` | Array de updates de DynamicWork. |
| SyncConflict | `external_payload_summary` | JSON string | `jsonb` | Resumo leve do payload. |
| CardOverride | `original_snapshot` | object | `jsonb` | Snapshot dos dados originais. |

### D.2 Campos Array nativos → array Postgres

| Entidade | Campo Atual | Tipo Atual | Tipo Supabase |
|----------|-------------|-----------|--------------|
| News | `sources` | array of objects | `jsonb` (array de objetos `{name, url}`) |
| SocialEvent | `participants` | array of strings | `text[]` |
| SocialEvent | `participants_names` | array of strings | `text[]` |
| Community | `members` | array of strings | `text[]` |
| Community | `tags` | array of strings | `text[]` |
| Post | `liked_by` | array of strings | `text[]` (ou tabela `post_likes` para escalabilidade) |
| Comment | `liked_by` | array of strings | `text[]` (ou tabela `comment_likes`) |
| Debate | `tags` | array of strings | `text[]` |
| MediaWork | `genres` | array of strings | `text[]` |
| UserProfile | `favorite_animes` | array of strings | `text[]` |
| UserProfile | `favorite_mangas` | array of strings | `text[]` |
| UserProfile | `avatar_crop` | object | `jsonb` |
| UserProfile | `banner_crop` | object | `jsonb` |
| UserProfile | `links` | object | `jsonb` |

### D.3 Candidatos a tabela relacionada (avaliar)

| Campo Atual | Problema | Solução Potencial |
|-------------|----------|-------------------|
| Post `liked_by` | Array cresce indefinidamente; hard de indexar | Tabela `post_likes(post_id, user_id)` com PK composta |
| Comment `liked_by` | Idem | Tabela `comment_likes(comment_id, user_id)` |
| Community `members` | Array de emails; hard de fazer JOIN | Tabela `community_members(community_id, user_id)` |
| SocialEvent `participants` | Idem | Tabela `event_participants(event_id, user_id)` |

---

## E. ENUMS → TIPOS POSTGRES

### E.1 Enums de catálogo

```sql
CREATE TYPE work_category AS ENUM ('anime', 'manga', 'movie', 'liveaction');
CREATE TYPE work_format AS ENUM ('TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MANGA', 'NOVEL');
CREATE TYPE release_status AS ENUM ('releasing', 'finished', 'not_yet_released', 'cancelled', 'hiatus');
CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'manual_override');
CREATE TYPE catalog_sync_status AS ENUM ('synced', 'not_found', 'manual_override');
```

### E.2 Enums de provider

```sql
CREATE TYPE external_provider AS ENUM ('anilist', 'mal', 'tmdb', 'thetvdb');
```

### E.3 Enums de progresso

```sql
CREATE TYPE anime_entry_type AS ENUM ('anime', 'manga');
CREATE TYPE anime_entry_status AS ENUM ('watching', 'reading', 'completed', 'planned', 'dropped', 'on_hold');
```

### E.4 Enums de sync

```sql
CREATE TYPE sync_run_status AS ENUM ('running', 'completed', 'failed', 'interrupted');
CREATE TYPE sync_log_classification AS ENUM (
  'SYNC_SAFE', 'NO_CHANGES', 'REVIEW_REQUIRED', 'ID_MISMATCH',
  'ANILIST_NOT_FOUND', 'MAL_NOT_FOUND', 'MISSING_MAPPING',
  'SKIPPED_MANUAL_OVERRIDE', 'UPSTREAM_RATE_LIMITED', 'ERROR'
);
CREATE TYPE sync_conflict_type AS ENUM ('no_match', 'ambiguous_title', 'duplicate_candidate', 'missing_relation', 'category_mismatch');
CREATE TYPE sync_conflict_status AS ENUM ('pending', 'resolved', 'dismissed');
CREATE TYPE sync_conflict_action AS ENUM ('link_existing', 'create_new_release', 'create_new_group', 'ignore');
```

### E.5 Enums sociais

```sql
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE post_type AS ENUM ('discussion', 'review', 'reaction', 'theory', 'general');
CREATE TYPE community_category AS ENUM ('anime', 'manga', 'general', 'theories', 'reviews', 'news');
CREATE TYPE event_type AS ENUM ('watch_episode', 'watch_marathon', 'read_chapter', 'debate', 'theory_night', 'watch_party');
CREATE TYPE event_status AS ENUM ('scheduled', 'happening', 'finished');
CREATE TYPE visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE watch_together_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');
CREATE TYPE notification_type AS ENUM (
  'friend_request', 'friend_accepted', 'post_liked', 'post_commented',
  'event_invite', 'event_reminder', 'list_update',
  'watch_together_invite', 'watch_together_near_5', 'watch_together_near_1',
  'direct_message', 'mention', 'event_message'
);
CREATE TYPE activity_type AS ENUM (
  'watch_together_created', 'list_commented', 'event_invited',
  'started_watching_together', 'friend_added'
);
CREATE TYPE xp_event_type AS ENUM (
  'achievement_unlocked', 'level_up', 'episode_watched',
  'chapter_read', 'post_created', 'work_completed'
);
```

### E.6 Enums de CMS

```sql
CREATE TYPE news_category AS ENUM ('anime', 'manga', 'movie', 'liveaction', 'general');
CREATE TYPE news_status AS ENUM ('rascunho', 'publicado');
CREATE TYPE video_type AS ENUM ('none', 'embed', 'file');
CREATE TYPE content_report_reason AS ENUM ('spam', 'hate_speech', 'nsfw', 'harassment', 'spoiler', 'misinformation', 'other');
CREATE TYPE content_report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE admin_action AS ENUM ('warning', 'content_removed', 'user_warned', 'user_suspended');
CREATE TYPE work_suggestion_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE list_visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE preferred_language AS ENUM ('pt', 'en', 'es', 'ja', 'other');
```

---

## F. TIMESTAMPS

### F.1 Built-in (preservar em todas as tabelas)

| Campo | Tipo Supabase | Notas |
|------|---------------|-------|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | Preservar valor na importação |
| `created_date` | `timestamptz DEFAULT now()` | Preservar valor na importação |
| `updated_date` | `timestamptz DEFAULT now()` | Trigger para auto-update |
| `created_by_id` | `uuid REFERENCES auth.users(id)` | Mapear para novo user ID |

### F.2 Timestamps de domínio

| Entidade | Campo | Tipo |
|----------|-------|------|
| DynamicWork | `last_synced_at` | `timestamptz` |
| WorkRelease | `last_synced_at` | `timestamptz` |
| ExternalMapping | `last_synced_at` | `timestamptz` |
| CatalogSync | `synced_at` | `timestamptz` |
| SyncRun | `started_at`, `completed_at`, `last_checkpoint_at` | `timestamptz` |
| SyncLog | `timestamp` | `timestamptz` |
| SyncConflict | `resolved_at` | `timestamptz` |
| News | `published_at` | `timestamptz` |
| CardOverride | `edited_at` | `timestamptz` |
| WorkSuggestion | `created_at`, `reviewed_at` | `timestamptz` |
| ContentReport | `created_at`, `reviewed_at` | `timestamptz` |
| UserProfile | `profile_setup_completed_at` | `timestamptz` |
| UserProfile | `last_activity_date` | `date` (formato YYYY-MM-DD) |
| UserAchievement | `unlocked_at` | `timestamptz` |
| XpEvent | `event_date` | `timestamptz` |

### F.3 Trigger de updated_date

```sql
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas:
CREATE TRIGGER trg_update_timestamp
  BEFORE UPDATE ON dynamic_works
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();
-- (repetir para cada tabela)
```

---

## G. RLS — MAPEAMENTO DE REGRAS

### G.1 Padrões atuais do Base44 → Postgres RLS

| Padrão Base44 | Equivalente Supabase |
|---------------|---------------------|
| `"created_by": "{{user.email}}"` | `auth.uid() = created_by_id` (após mapear para uuid) |
| `"data.user_email": "{{user.email}}"` | `auth.jwt() ->> 'email' = user_email` |
| `"data.organizer_email": "{{user.email}}"` | `auth.jwt() ->> 'email' = organizer_email` |
| `"data.recipient_email": "{{user.email}}"` | `auth.jwt() ->> 'email' = recipient_email` |
| `"data.participants": {"$in": ["{{user.email}}"]}` | `auth.jwt() ->> 'email' = ANY(participants)` |
| `"user_condition": {"role": "admin"}` | `auth.jwt() ->> 'role' = 'admin'` |
| `"data.visibility": "public"` | `visibility = 'public'` |
| `"data.status": "publicado"` (News) | `status = 'publicado'` |
| `"$or": [...]` | `(...) OR (...)` |
| `read: {}` (público) | Sem policy de SELECT (ou `USING (true)`) |
| `read: {"user_condition": {"role": "admin"}}` | `USING (auth.jwt() ->> 'role' = 'admin')` |

### G.2 Tabelas com RLS admin-only (create/update/delete)

```sql
-- dynamic_works, work_releases, external_mappings, catalog_sync,
-- card_overrides, work_category_visibilities, sync_runs, sync_logs,
-- sync_conflicts, achievements, news, fan_arts, platform_banners,
-- login_background_images, site_config, debates, media_works

ALTER TABLE dynamic_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read" ON dynamic_works
  FOR SELECT USING (true); -- catálogo é público

CREATE POLICY "admin_write" ON dynamic_works
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

### G.3 Tabelas com RLS por propriedade (user_email / created_by)

```sql
-- anime_entries, user_profiles, user_achievements, xp_events,
-- posts, comments, social_events, event_comments, watch_togethers,
-- direct_messages, notifications, activity_feed, friendships,
-- work_suggestions, content_reports

-- Exemplo: anime_entries
ALTER TABLE anime_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_entries_read" ON anime_entries
  FOR SELECT USING (
    auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "own_entries_write" ON anime_entries
  FOR ALL USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );
```

### G.4 Tabelas públicas de leitura

```sql
-- communities, debates, achievements, news (status=publicado),
-- fan_arts (active=true), platform_banners (active=true),
-- login_background_images (active=true), site_config

CREATE POLICY "public_read" ON communities FOR SELECT USING (true);
CREATE POLICY "creator_write" ON communities
  FOR ALL USING (
    auth.jwt() ->> 'email' = creator_email
    OR auth.jwt() ->> 'role' = 'admin'
  );
```

### G.5 Casos especiais

```sql
-- News: apenas status='publicado' é público
CREATE POLICY "public_read_news" ON news
  FOR SELECT USING (status = 'publicado' OR auth.jwt() ->> 'role' = 'admin');

-- SocialEvent: public OU organizer OU participant OU admin
CREATE POLICY "event_read" ON social_events
  FOR SELECT USING (
    visibility = 'public'
    OR organizer_email = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'email' = ANY(participants)
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- DirectMessage: apenas sender ou receiver
CREATE POLICY "dm_read" ON direct_messages
  FOR SELECT USING (
    sender_email = auth.jwt() ->> 'email'
    OR receiver_email = auth.jwt() ->> 'email'
  );

-- Notification: apenas recipient
CREATE POLICY "notif_read" ON notifications
  FOR SELECT USING (
    recipient_email = auth.jwt() ->> 'email'
  );
```

### G.6 Role admin no JWT

Para que `auth.jwt() ->> 'role' = 'admin'` funcione, é necessário:
1. Criar coluna `role` em `auth.users` (ou tabela `user_roles` separada).
2. Configurar JWT custom claims no Supabase para incluir `role`.
3. Ou usar `auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')`.

```sql
CREATE TABLE user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  PRIMARY KEY (user_id)
);

-- Helper function para RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## H. STORAGE (Upload de arquivos)

| Bucket Atual (Base44) | Bucket Supabase | Uso |
|----------------------|-----------------|-----|
| `files` (público) | `public-assets` | Avatares, banners, news images, fanart |
| `private-files` | `private-assets` | Arquivos privados (signed URLs) |

### Políticas de storage

```sql
-- Avatares: usuário pode upload do próprio
CREATE POLICY "avatar_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public-assets'
    AND auth.uid() = owner
  );
``