-- ============================================================================
-- AniZoku — Initial Schema Migration (0001)
-- ============================================================================
-- PRINCÍPIO: PRESERVAÇÃO > NORMALIZAÇÃO
--
-- IDs Base44 = MongoDB ObjectId (24-char hex) → TEXT PRIMARY KEY (NÃO uuid)
-- FKs entre entidades migradas = TEXT
-- FKs para auth.users = UUID (novos campos *_id nullable)
-- Campos *_email legados preservados (não removidos nesta fase)
-- created_by_id preservado como TEXT; created_by UUID adicionado nullable
-- NÃO criar UNIQUE(dynamic_works.slug) — 102 grupos duplicados
-- Criar UNIQUE(work_releases.slug) — 0 duplicatas
-- NÃO usar CASCADE onde possa apagar dados sociais/históricos
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================
CREATE TYPE work_category AS ENUM ('anime', 'manga', 'movie', 'liveaction');
CREATE TYPE work_release_status AS ENUM ('releasing', 'finished', 'not_yet_released', 'cancelled', 'hiatus');
CREATE TYPE work_release_sync_status AS ENUM ('synced', 'pending', 'manual_override');
CREATE TYPE dynamic_work_sync_status AS ENUM ('synced', 'manual_override');

CREATE TYPE provider_type AS ENUM ('anilist', 'mal', 'tmdb', 'thetvdb');

CREATE TYPE anime_entry_type AS ENUM ('anime', 'manga');
CREATE TYPE anime_entry_status AS ENUM ('watching', 'reading', 'completed', 'planned', 'dropped', 'on_hold');

CREATE TYPE catalog_sync_status AS ENUM ('synced', 'not_found', 'manual_override');

CREATE TYPE sync_run_status AS ENUM ('running', 'completed', 'failed', 'interrupted');
CREATE TYPE sync_log_classification AS ENUM (
  'SYNC_SAFE', 'NO_CHANGES', 'REVIEW_REQUIRED', 'ID_MISMATCH',
  'ANILIST_NOT_FOUND', 'MAL_NOT_FOUND', 'MISSING_MAPPING',
  'SKIPPED_MANUAL_OVERRIDE', 'UPSTREAM_RATE_LIMITED', 'ERROR'
);
CREATE TYPE sync_conflict_type AS ENUM ('no_match', 'ambiguous_title', 'duplicate_candidate', 'missing_relation', 'category_mismatch');
CREATE TYPE sync_conflict_action AS ENUM ('link_existing', 'create_new_release', 'create_new_group', 'ignore');
CREATE TYPE sync_conflict_status AS ENUM ('pending', 'resolved', 'dismissed');

CREATE TYPE community_category AS ENUM ('anime', 'manga', 'general', 'theories', 'reviews', 'news');
CREATE TYPE post_type AS ENUM ('discussion', 'review', 'reaction', 'theory', 'general');

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE watch_together_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');
CREATE TYPE watch_together_media_type AS ENUM ('anime', 'manga');

CREATE TYPE social_event_type AS ENUM ('watch_episode', 'watch_marathon', 'read_chapter', 'debate', 'theory_night', 'watch_party');
CREATE TYPE social_event_visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE social_event_status AS ENUM ('scheduled', 'happening', 'finished');
CREATE TYPE social_event_media_type AS ENUM ('anime', 'manga');

CREATE TYPE activity_type AS ENUM ('watch_together_created', 'list_commented', 'event_invited', 'started_watching_together', 'friend_added');

CREATE TYPE xp_event_type AS ENUM ('achievement_unlocked', 'level_up', 'episode_watched', 'chapter_read', 'post_created', 'work_completed');

CREATE TYPE news_category AS ENUM ('anime', 'manga', 'movie', 'liveaction', 'general');
CREATE TYPE news_status AS ENUM ('rascunho', 'publicado');
CREATE TYPE news_video_type AS ENUM ('none', 'embed', 'file');

CREATE TYPE content_report_type AS ENUM ('post', 'comment', 'reply', 'profile');
CREATE TYPE content_report_reason AS ENUM ('spam', 'hate_speech', 'nsfw', 'harassment', 'spoiler', 'misinformation', 'other');
CREATE TYPE content_report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE content_report_admin_action AS ENUM ('warning', 'content_removed', 'user_warned', 'user_suspended');

CREATE TYPE work_suggestion_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE work_suggestion_type AS ENUM ('anime', 'manga');

CREATE TYPE profile_visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE preferred_language AS ENUM ('pt', 'en', 'es', 'ja', 'other');

CREATE TYPE notification_type AS ENUM (
  'friend_request', 'friend_accepted', 'post_liked', 'post_commented',
  'event_invite', 'event_reminder', 'list_update', 'watch_together_invite',
  'watch_together_near_5', 'watch_together_near_1', 'direct_message',
  'mention', 'event_message'
);

-- ============================================================================
-- 3. AUXILIARY TABLES (criadas antes das helper functions que as referenciam)
-- ============================================================================

-- user_roles: mapeia user_id → role (espelha Base44 User.role)
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- id_mapping: traduz base44_id (ObjectId) → supabase_id (UUID)
CREATE TABLE id_mapping (
  base44_id TEXT NOT NULL,
  supabase_id UUID,
  entity_type TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (base44_id, entity_type)
);

-- url_mapping: rastreia URLs Base44 Storage → Supabase Storage
CREATE TABLE url_mapping (
  base44_url TEXT PRIMARY KEY,
  supabase_url TEXT,
  migrated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- is_admin(): verifica se o usuário atual tem role 'admin' via user_roles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- is_owner(base44_id): verifica se um base44_id pertence ao usuário atual via id_mapping
CREATE OR REPLACE FUNCTION is_owner(base44_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM id_mapping
    WHERE base44_id = $1 AND supabase_id = auth.uid()
  );
$$;

-- current_user_email(): retorna o email do usuário atual via JWT
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'email';
$$;

-- set_updated_date(): trigger function para auto-updated_date
CREATE OR REPLACE FUNCTION set_updated_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. CATALOG TABLES
-- ============================================================================

CREATE TABLE dynamic_works (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID, -- nullable, preenchido via id_mapping

  slug TEXT,
  title TEXT,
  title_pt TEXT,
  romaji_title TEXT,
  categories jsonb,        -- JSON array serializado → jsonb
  genres jsonb,            -- JSON array serializado → jsonb
  synopsis TEXT,
  episodes INTEGER,
  chapters INTEGER,
  volumes INTEGER,
  anime_status TEXT,       -- PT-BR strings ('Em exibição', etc.)
  manga_status TEXT,
  mal_id BIGINT,
  manga_mal_id BIGINT,
  score NUMERIC(4,2),
  year INTEGER,
  duration TEXT,           -- legacy string (ex: '24 min/ep')
  image_url TEXT,
  source TEXT,
  sync_status dynamic_work_sync_status DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  popularity_rank INTEGER,
  is_currently_airing BOOLEAN DEFAULT false,
  season TEXT,             -- 'winter_2025', etc.
  season_year INTEGER,
  is_trending BOOLEAN DEFAULT false,
  trending_rank INTEGER,
  franchise_id TEXT,       -- mal_id da raiz (string p/ IDs grandes)
  franchise_title TEXT,
  franchise_score NUMERIC(4,2),
  franchise_poster_url TEXT,
  seasons jsonb,           -- JSON array serializado → jsonb (legacy, preservado)
  related_franchise_id TEXT,
  sync_release_completed BOOLEAN DEFAULT false,
  release_count INTEGER DEFAULT 0
);

CREATE TABLE work_releases (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  group_id TEXT,           -- FK → dynamic_works(id)
  group_slug TEXT,         -- denormalizado
  slug TEXT,               -- UNIQUE (0 duplicatas validado)
  title TEXT,
  title_romaji TEXT,
  title_english TEXT,
  title_native TEXT,
  category work_category,
  format TEXT,             -- AniList format (TV|MOVIE|OVA|ONA|SPECIAL|MANGA|NOVEL|etc.) — open-ended
  season TEXT,             -- winter|spring|summer|fall
  season_year INTEGER,
  episode_count INTEGER,
  chapter_count INTEGER,
  duration_minutes NUMERIC,
  release_order INTEGER,
  display_order INTEGER,
  status work_release_status,
  is_main_entry BOOLEAN DEFAULT false,
  is_special BOOLEAN DEFAULT false,
  is_movie BOOLEAN DEFAULT false,
  is_live_action BOOLEAN DEFAULT false,
  synopsis TEXT,
  cover_url TEXT,
  banner_url TEXT,
  score NUMERIC(4,2),
  popularity INTEGER,
  trending_score NUMERIC DEFAULT 0,
  trending_rank INTEGER,
  sync_status work_release_sync_status DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ
);

CREATE TABLE external_mappings (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  work_group_id TEXT,     -- FK → dynamic_works(id), nullable
  work_release_id TEXT,   -- FK → work_releases(id), nullable
  provider provider_type,
  provider_id TEXT,
  provider_url TEXT,
  provider_type_field TEXT, -- nome do campo = provider_type_field p/ não conflitar com enum
  confidence_score NUMERIC DEFAULT 100,
  verified_by_admin BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ
);

CREATE TABLE catalog_sync (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  slug TEXT,
  total_episodes INTEGER,
  total_chapters INTEGER,
  total_volumes INTEGER,
  anime_status TEXT,
  manga_status TEXT,
  mal_id BIGINT,
  manga_mal_id BIGINT,
  score NUMERIC(4,2),
  romaji_title TEXT,
  synced_at TIMESTAMPTZ,
  sync_status catalog_sync_status DEFAULT 'synced',
  franchise_id TEXT
);

CREATE TABLE card_overrides (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  card_slug TEXT,
  category work_category,
  override_title TEXT,
  override_description TEXT,
  override_image_url TEXT,
  is_manual_override BOOLEAN DEFAULT true,
  sync_disabled BOOLEAN DEFAULT true,
  edited_by TEXT,
  edited_by_name TEXT,
  edited_at TIMESTAMPTZ,
  original_snapshot jsonb,
  notes TEXT
);

CREATE TABLE work_category_visibility (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  work_slug TEXT,
  work_title TEXT,
  show_in_animes BOOLEAN DEFAULT true,
  show_in_mangas BOOLEAN DEFAULT true,
  show_in_liveaction BOOLEAN DEFAULT true,
  show_in_filmes BOOLEAN DEFAULT true,
  updated_by TEXT
);

CREATE TABLE media_works (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  title TEXT,
  category work_category,
  cover_url TEXT,
  banner_url TEXT,
  genres text[],
  rating NUMERIC DEFAULT 0
);

-- ============================================================================
-- 6. USER / PROGRESS TABLES
-- ============================================================================

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  user_email TEXT,
  user_id UUID,            -- nullable, FK → auth.users(id) via ALTER
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  avatar_crop jsonb,
  banner_url TEXT,
  banner_crop jsonb,
  country TEXT,
  preferred_language preferred_language,
  links jsonb,
  favorite_animes text[],
  favorite_mangas text[],
  selected_badge_id TEXT,
  list_visibility profile_visibility DEFAULT 'public',
  profile_visibility profile_visibility DEFAULT 'public',
  profile_setup_completed BOOLEAN DEFAULT false,
  profile_setup_completed_at TIMESTAMPTZ,
  push_enabled BOOLEAN DEFAULT false,
  achievement_sound_enabled BOOLEAN DEFAULT true,
  current_streak INTEGER DEFAULT 0,
  last_activity_date TEXT,
  login_streak INTEGER DEFAULT 0
);

CREATE TABLE anime_entries (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  user_id UUID,            -- nullable, FK → auth.users(id)
  title TEXT,
  type anime_entry_type,
  cover_url TEXT,
  status anime_entry_status DEFAULT 'planned',
  current_episode INTEGER DEFAULT 0,
  total_episodes INTEGER,
  current_chapter INTEGER DEFAULT 0,
  total_chapters INTEGER,
  rating INTEGER,
  notes TEXT,
  genre TEXT,
  season_mal_id BIGINT,
  release_id TEXT,         -- FK → work_releases(id), nullable
  external_provider TEXT,
  external_provider_id TEXT,
  external_provider_type TEXT
);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  key TEXT,                -- UNIQUE
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  xp INTEGER DEFAULT 0
);

CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  user_email TEXT,
  user_id UUID,            -- nullable
  achievement_key TEXT,
  unlocked_at TIMESTAMPTZ
);

CREATE TABLE xp_events (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  user_email TEXT,
  user_id UUID,            -- nullable
  event_type xp_event_type,
  achievement_id TEXT,
  xp_amount INTEGER DEFAULT 0,
  event_date TIMESTAMPTZ
);

-- ============================================================================
-- 7. SYNC TABLES
-- ============================================================================

CREATE TABLE sync_runs (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  run_id TEXT,             -- UNIQUE
  dry_run BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status sync_run_status DEFAULT 'running',
  total_releases INTEGER DEFAULT 0,
  processed_release_ids TEXT, -- JSON array (preservar como TEXT p/ compatibilidade)
  current_batch INTEGER DEFAULT 0,
  batches_completed INTEGER DEFAULT 0,
  errors TEXT,             -- JSON array
  last_checkpoint_at TIMESTAMPTZ,
  summary TEXT             -- JSON object
);

CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  run_id TEXT,             -- FK → sync_runs(run_id) (não PK)
  release_id TEXT,
  release_slug TEXT,
  mal_id BIGINT,
  anilist_id BIGINT,
  match_valid BOOLEAN,
  classification sync_log_classification,
  proposed_fields TEXT,    -- JSON (preservar TEXT p/ compatibilidade)
  written_fields TEXT,     -- JSON
  reviews TEXT,            -- JSON
  ignored TEXT,            -- JSON
  dw_updates TEXT,         -- JSON
  error_message TEXT,
  timestamp TIMESTAMPTZ
);

CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  provider provider_type,
  provider_id TEXT,
  provider_type_field TEXT,
  external_title TEXT,
  external_payload_summary TEXT,
  possible_work_group_id TEXT,
  possible_work_release_id TEXT,
  conflict_type sync_conflict_type,
  confidence_score NUMERIC,
  suggested_action sync_conflict_action,
  status sync_conflict_status DEFAULT 'pending',
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

-- ============================================================================
-- 8. SOCIAL TABLES
-- ============================================================================

CREATE TABLE friendships (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  requester_email TEXT,
  receiver_email TEXT,
  requester_id UUID,      -- nullable
  receiver_id UUID,      -- nullable
  requester_name TEXT,
  receiver_name TEXT,
  status friendship_status DEFAULT 'pending'
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  content TEXT,
  image_url TEXT,
  anime_title TEXT,
  post_type post_type DEFAULT 'general',
  community_id TEXT,      -- FK → communities(id), nullable
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  liked_by text[],
  author_name TEXT,
  author_avatar TEXT,
  author_level INTEGER DEFAULT 1
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  post_id TEXT,           -- FK → posts(id)
  parent_id TEXT,         -- FK → comments(id), nullable (self-ref)
  content TEXT,
  author_name TEXT,
  author_avatar TEXT,
  likes_count INTEGER DEFAULT 0,
  liked_by text[]
);

CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  name TEXT,
  description TEXT,
  cover_url TEXT,
  avatar_url TEXT,
  members_count INTEGER DEFAULT 0,
  category community_category DEFAULT 'general',
  tags text[],
  creator_email TEXT,
  creator_id UUID,        -- nullable
  members text[]          -- array de emails (preservar)
);

CREATE TABLE social_events (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  title TEXT,
  description TEXT,
  media_title TEXT,
  event_type social_event_type DEFAULT 'watch_episode',
  media_type social_event_media_type DEFAULT 'anime',
  event_date TIMESTAMPTZ,
  max_participants INTEGER,
  visibility social_event_visibility DEFAULT 'public',
  status social_event_status DEFAULT 'scheduled',
  organizer_email TEXT,
  organizer_id UUID,      -- nullable
  organizer_name TEXT,
  participants text[],    -- array de emails
  participants_names text[]
);

CREATE TABLE event_comments (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  event_id TEXT,          -- FK → social_events(id)
  content TEXT,
  author_name TEXT,
  author_email TEXT,
  author_id UUID          -- nullable
);

CREATE TABLE watch_togethers (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  initiator_email TEXT,
  initiator_id UUID,      -- nullable
  initiator_name TEXT,
  friend_email TEXT,
  friend_id UUID,        -- nullable
  friend_name TEXT,
  media_title TEXT,
  media_type watch_together_media_type DEFAULT 'anime',
  target_episode INTEGER,
  target_chapter INTEGER,
  status watch_together_status DEFAULT 'pending',
  notified_5 BOOLEAN DEFAULT false,
  notified_1 BOOLEAN DEFAULT false
);

CREATE TABLE direct_messages (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  sender_email TEXT,
  sender_id UUID,         -- nullable
  receiver_email TEXT,
  receiver_id UUID,       -- nullable
  content TEXT,
  is_read BOOLEAN DEFAULT false
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  recipient_email TEXT,
  recipient_id UUID,      -- nullable
  type notification_type,
  message TEXT,
  from_name TEXT,
  from_email TEXT,
  reference_id TEXT,
  is_read BOOLEAN DEFAULT false
);

CREATE TABLE activity_feed (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  actor_email TEXT,
  actor_id UUID,          -- nullable
  actor_name TEXT,
  target_email TEXT,
  target_id UUID,         -- nullable
  target_name TEXT,
  activity_type activity_type,
  media_title TEXT,
  media_episode INTEGER,
  description TEXT
);

CREATE TABLE debates (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  title TEXT,
  description TEXT,
  anime_title TEXT,
  author_name TEXT,
  replies_count INTEGER DEFAULT 0,
  is_hot BOOLEAN DEFAULT false,
  tags text[]
);

-- ============================================================================
-- 9. CMS / ADMIN TABLES
-- ============================================================================

CREATE TABLE news (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  title TEXT,
  slug TEXT,              -- UNIQUE
  summary TEXT,
  content TEXT,
  category news_category DEFAULT 'general',
  image_url TEXT,
  banner_image_url TEXT,
  card_image_url TEXT,
  article_image_url TEXT,
  video_type news_video_type DEFAULT 'none',
  video_url TEXT,
  video_provider TEXT,
  sources jsonb,           -- array de {name, url}
  source_url TEXT,
  source_name TEXT,
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT false,
  author_name TEXT,
  author_id TEXT,         -- snapshot legado (não é auth.users)
  status news_status DEFAULT 'rascunho',
  reading_minutes INTEGER
);

CREATE TABLE fan_art (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  image_url TEXT,
  title TEXT,
  work_slug TEXT,
  work_title TEXT,
  artist_name TEXT,
  artist_instagram TEXT,
  artist_twitter TEXT,
  artist_website TEXT,
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0
);

CREATE TABLE platform_banners (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  image_url TEXT,
  title TEXT,
  link_url TEXT,
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0
);

CREATE TABLE login_background_images (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  image_url TEXT,
  title TEXT,
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0
);

CREATE TABLE site_config (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  label TEXT,
  logo_compact_url TEXT,
  logo_full_url TEXT,
  achievement_sound_url TEXT,
  updated_by TEXT
);

CREATE TABLE work_suggestions (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  suggested_by_email TEXT,
  suggested_by_id UUID,   -- nullable
  title TEXT,
  type work_suggestion_type,
  mal_id BIGINT,
  image_url TEXT,
  synopsis TEXT,
  year INTEGER,
  score NUMERIC(4,2),
  status TEXT,
  episodes INTEGER,
  chapters INTEGER,
  genres TEXT,
  mal_url TEXT,
  suggestion_status work_suggestion_status DEFAULT 'pending',
  admin_note TEXT,
  created_at TEXT,        -- legacy string timestamp (preservar)
  reviewed_at TEXT         -- legacy string timestamp
);

CREATE TABLE content_reports (
  id TEXT PRIMARY KEY,
  created_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  created_by_id TEXT,
  created_by UUID,

  reported_by_email TEXT,
  reported_by_id UUID,    -- nullable
  content_type content_report_type,
  content_id TEXT,
  content_preview TEXT,
  author_email TEXT,
  reason content_report_reason,
  description TEXT,
  report_status content_report_status DEFAULT 'pending',
  admin_action content_report_admin_action,
  admin_note TEXT,
  created_at TEXT,        -- legacy string timestamp (preservar)
  reviewed_at TEXT         -- legacy string timestamp
);

-- ============================================================================
-- 10. FOREIGN KEYS (adicionadas após todas as tabelas)
-- ============================================================================
-- Decisões ON DELETE:
--   CASCADE: apenas parent→child claro (work_releases→dynamic_works)
--   SET NULL: quando a referência é opcional e não queremos apagar dados sociais
--   RESTRICT: quando apagar o alvo poderia causar perda histórica
-- ============================================================================

-- Catalog FKs
ALTER TABLE work_releases ADD CONSTRAINT fk_wr_group
  FOREIGN KEY (group_id) REFERENCES dynamic_works(id) ON DELETE CASCADE;

ALTER TABLE external_mappings ADD CONSTRAINT fk_em_group
  FOREIGN KEY (work_group_id) REFERENCES dynamic_works(id) ON DELETE SET NULL;

ALTER TABLE external_mappings ADD CONSTRAINT fk_em_release
  FOREIGN KEY (work_release_id) REFERENCES work_releases(id) ON DELETE SET NULL;

ALTER TABLE anime_entries ADD CONSTRAINT fk_ae_release
  FOREIGN KEY (release_id) REFERENCES work_releases(id) ON DELETE SET NULL;

-- Sync FKs
ALTER TABLE sync_logs ADD CONSTRAINT fk_sl_run
  FOREIGN KEY (run_id) REFERENCES sync_runs(run_id) ON DELETE CASCADE;

-- Social FKs
ALTER TABLE posts ADD CONSTRAINT fk_p_community
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL;

ALTER TABLE comments ADD CONSTRAINT fk_c_post
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE comments ADD CONSTRAINT fk_c_parent
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;

ALTER TABLE event_comments ADD CONSTRAINT fk_ec_event
  FOREIGN KEY (event_id) REFERENCES social_events(id) ON DELETE CASCADE;

-- auth.users FKs (UUID, nullable — preenchidos via id_mapping)
ALTER TABLE user_profiles ADD CONSTRAINT fk_up_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE anime_entries ADD CONSTRAINT fk_ae_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_achievements ADD CONSTRAINT fk_ua_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE xp_events ADD CONSTRAINT fk_xe_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE friendships ADD CONSTRAINT fk_f_requester
  FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE friendships ADD CONSTRAINT fk_f_receiver
  FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE posts ADD CONSTRAINT fk_p_author
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE comments ADD CONSTRAINT fk_c_author
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE communities ADD CONSTRAINT fk_com_creator
  FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE social_events ADD CONSTRAINT fk_se_organizer
  FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE event_comments ADD CONSTRAINT fk_ec_author
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE watch_togethers ADD CONSTRAINT fk_wt_initiator
  FOREIGN KEY (initiator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE watch_togethers ADD CONSTRAINT fk_wt_friend
  FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE direct_messages ADD CONSTRAINT fk_dm_sender
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE direct_messages ADD CONSTRAINT fk_dm_receiver
  FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE notifications ADD CONSTRAINT fk_n_recipient
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE activity_feed ADD CONSTRAINT fk_af_actor
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE activity_feed ADD CONSTRAINT fk_af_target
  FOREIGN KEY (target_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE work_suggestions ADD CONSTRAINT fk_ws_suggested_by
  FOREIGN KEY (suggested_by_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE content_reports ADD CONSTRAINT fk_cr_reported_by
  FOREIGN KEY (reported_by_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- 11. UNIQUE CONSTRAINTS (apenas onde validado)
-- ============================================================================

-- WorkRelease: 0 slugs duplicados → UNIQUE seguro
ALTER TABLE work_releases ADD CONSTRAINT uq_wr_slug UNIQUE (slug);

-- ExternalMapping: 0 duplicatas (provider, provider_id) → UNIQUE seguro
ALTER TABLE external_mappings ADD CONSTRAINT uq_em_provider UNIQUE (provider, provider_id);

-- DynamicWork: 102 grupos duplicados → NÃO criar UNIQUE(slug)
-- (resolver duplicatas em fase de normalização posterior)

-- UserProfile: user_email único
ALTER TABLE user_profiles ADD CONSTRAINT uq_up_email UNIQUE (user_email);

-- Achievement: key único
ALTER TABLE achievements ADD CONSTRAINT uq_ach_key UNIQUE (key);

-- News: slug único
ALTER TABLE news ADD CONSTRAINT uq_news_slug UNIQUE (slug);

-- SyncRun: run_id único
ALTER TABLE sync_runs ADD CONSTRAINT uq_sr_run_id UNIQUE (run_id);

-- ============================================================================
-- 12. INDICES
-- ============================================================================
CREATE INDEX idx_wr_group_id ON work_releases (group_id);
CREATE INDEX idx_em_release_id ON external_mappings (work_release_id);
CREATE INDEX idx_em_group_id ON external_mappings (work_group_id);
CREATE INDEX idx_em_provider ON external_mappings (provider, provider_id);

CREATE INDEX idx_ae_user_id ON anime_entries (user_id);
CREATE INDEX idx_ae_user_email ON anime_entries (created_by_id);
CREATE INDEX idx_ae_release_id ON anime_entries (release_id);

CREATE INDEX idx_up_user_email ON user_profiles (user_email);
CREATE INDEX idx_up_user_id ON user_profiles (user_id);

CREATE INDEX idx_ua_user_email ON user_achievements (user_email);
CREATE INDEX idx_ua_user_id ON user_achievements (user_id);
CREATE INDEX idx_ua_achievement_key ON user_achievements (achievement_key);

CREATE INDEX idx_xe_user_email ON xp_events (user_email);
CREATE INDEX idx_xe_user_id ON xp_events (user_id);
CREATE INDEX idx_xe_event_date ON xp_events (event_date);

CREATE INDEX idx_p_community_id ON posts (community_id);
CREATE INDEX idx_p_created_by ON posts (created_by_id);
CREATE INDEX idx_p_created_by_uuid ON posts (created_by);
CREATE INDEX idx_p_created_date ON posts (created_date);

CREATE INDEX idx_c_post_id ON comments (post_id);
CREATE INDEX idx_c_parent_id ON comments (parent_id);
CREATE INDEX idx_c_created_by ON comments (created_by_id);

CREATE INDEX idx_com_creator_email ON communities (creator_email);
CREATE INDEX idx_com_creator_id ON communities (creator_id);

CREATE INDEX idx_se_organizer_email ON social_events (organizer_email);
CREATE INDEX idx_se_organizer_id ON social_events (organizer_id);
CREATE INDEX idx_se_event_date ON social_events (event_date);

CREATE INDEX idx_ec_event_id ON event_comments (event_id);
CREATE INDEX idx_ec_author_email ON event_comments (author_email);

CREATE INDEX idx_wt_initiator_email ON watch_togethers (initiator_email);
CREATE INDEX idx_wt_friend_email ON watch_togethers (friend_email);

CREATE INDEX idx_dm_sender_email ON direct_messages (sender_email);
CREATE INDEX idx_dm_receiver_email ON direct_messages (receiver_email);

CREATE INDEX idx_n_recipient_email ON notifications (recipient_email);
CREATE INDEX idx_n_recipient_id ON notifications (recipient_id);
CREATE INDEX idx_n_is_read ON notifications (is_read);

CREATE INDEX idx_af_actor_email ON activity_feed (actor_email);
CREATE INDEX idx_af_target_email ON activity_feed (target_email);

CREATE INDEX idx_sl_run_id ON sync_logs (run_id);
CREATE INDEX idx_sl_release_id ON sync_logs (release_id);

CREATE INDEX idx_cs_slug ON catalog_sync (slug);
CREATE INDEX idx_co_card_slug ON card_overrides (card_slug);
CREATE INDEX idx_wcv_work_slug ON work_category_visibility (work_slug);

CREATE INDEX idx_news_slug ON news (slug);
CREATE INDEX idx_news_status ON news (status);
CREATE INDEX idx_news_published_at ON news (published_at);

CREATE INDEX idx_dw_franchise_id ON dynamic_works (franchise_id);
CREATE INDEX idx_dw_mal_id ON dynamic_works (mal_id);
CREATE INDEX idx_dw_is_trending ON dynamic_works (is_trending);
CREATE INDEX idx_dw_created_date ON dynamic_works (created_date);

CREATE INDEX idx_wr_slug ON work_releases (slug);
CREATE INDEX idx_wr_group_slug ON work_releases (group_slug);

CREATE INDEX idx_ws_suggested_by_email ON work_suggestions (suggested_by_email);
CREATE INDEX idx_ws_status ON work_suggestions (suggestion_status);

CREATE INDEX idx_cr_reported_by_email ON content_reports (reported_by_email);
CREATE INDEX idx_cr_status ON content_reports (report_status);

CREATE INDEX idx_im_base44_id ON id_mapping (base44_id);
CREATE INDEX idx_im_supabase_id ON id_mapping (supabase_id);
CREATE INDEX idx_im_email ON id_mapping (email);

-- ============================================================================
-- 13. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE dynamic_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_category_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_works ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_togethers ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;

ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_art ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_background_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- id_mapping e url_mapping: apenas admin (não expor mapeamentos)
ALTER TABLE id_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_mapping ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES — CATALOG (read: público, write: admin)
-- ----------------------------------------------------------------------------

-- dynamic_works: read {} (público), create/update/delete admin
CREATE POLICY dw_read ON dynamic_works FOR SELECT USING (true);
CREATE POLICY dw_write ON dynamic_works FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- work_releases: read {} (público), write admin
CREATE POLICY wr_read ON work_releases FOR SELECT USING (true);
CREATE POLICY wr_write ON work_releases FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- external_mappings: read {} (público), write admin
CREATE POLICY em_read ON external_mappings FOR SELECT USING (true);
CREATE POLICY em_write ON external_mappings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- catalog_sync: read {} (público), write admin
CREATE POLICY cs_read ON catalog_sync FOR SELECT USING (true);
CREATE POLICY cs_write ON catalog_sync FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- card_overrides: read {} (público), write admin
CREATE POLICY co_read ON card_overrides FOR SELECT USING (true);
CREATE POLICY co_write ON card_overrides FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- work_category_visibility: read {} (público), write admin
CREATE POLICY wcv_read ON work_category_visibility FOR SELECT USING (true);
CREATE POLICY wcv_write ON work_category_visibility FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- media_works: read {} (público), write admin
CREATE POLICY mw_read ON media_works FOR SELECT USING (true);
CREATE POLICY mw_write ON media_works FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- RLS POLICIES — USER / PROGRESS
-- ----------------------------------------------------------------------------

-- user_profiles: read (public OR own OR admin), create/update/delete own
CREATE POLICY up_read ON user_profiles FOR SELECT
  USING (profile_visibility = 'public' OR user_email = current_user_email() OR is_admin());
CREATE POLICY up_insert ON user_profiles FOR INSERT
  WITH CHECK (user_email = current_user_email() OR is_admin());
CREATE POLICY up_update ON user_profiles FOR UPDATE
  USING (user_email = current_user_email() OR is_admin())
  WITH CHECK (user_email = current_user_email() OR is_admin());
CREATE POLICY up_delete ON user_profiles FOR DELETE
  USING (user_email = current_user_email() OR is_admin());

-- anime_entries: read (own OR admin), create/update/delete (own OR admin)
CREATE POLICY ae_read ON anime_entries FOR SELECT
  USING (is_owner(created_by_id) OR is_admin());
CREATE POLICY ae_insert ON anime_entries FOR INSERT
  WITH CHECK (is_owner(created_by_id) OR is_admin());
CREATE POLICY ae_update ON anime_entries FOR UPDATE
  USING (is_owner(created_by_id) OR is_admin())
  WITH CHECK (is_owner(created_by_id) OR is_admin());
CREATE POLICY ae_delete ON anime_entries FOR DELETE
  USING (is_owner(created_by_id) OR is_admin());

-- achievements: read {} (público), write admin
CREATE POLICY ach_read ON achievements FOR SELECT USING (true);
CREATE POLICY ach_write ON achievements FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- user_achievements: read {} (público), create/update/delete own
CREATE POLICY ua_read ON user_achievements FOR SELECT
  USING (user_email = current_user_email() OR is_admin());
CREATE POLICY ua_insert ON user_achievements FOR INSERT
  WITH CHECK (user_email = current_user_email());
CREATE POLICY ua_update ON user_achievements FOR UPDATE
  USING (user_email = current_user_email());
CREATE POLICY ua_delete ON user_achievements FOR DELETE
  USING (user_email = current_user_email());

-- xp_events: read {} (público), create/update/delete own
CREATE POLICY xe_read ON xp_events FOR SELECT
  USING (user_email = current_user_email() OR is_admin());
CREATE POLICY xe_insert ON xp_events FOR INSERT
  WITH CHECK (user_email = current_user_email());
CREATE POLICY xe_update ON xp_events FOR UPDATE
  USING (user_email = current_user_email());
CREATE POLICY xe_delete ON xp_events FOR DELETE
  USING (user_email = current_user_email());

-- ----------------------------------------------------------------------------
-- RLS POLICIES — SYNC (admin only)
-- ----------------------------------------------------------------------------
CREATE POLICY sr_read ON sync_runs FOR SELECT USING (is_admin());
CREATE POLICY sr_write ON sync_runs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY sl_read ON sync_logs FOR SELECT USING (is_admin());
CREATE POLICY sl_write ON sync_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY sc_read ON sync_conflicts FOR SELECT USING (is_admin());
CREATE POLICY sc_write ON sync_conflicts FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- RLS POLICIES — SOCIAL
-- ----------------------------------------------------------------------------

-- friendships: read (requester OR receiver OR admin), create (requester), update/delete (requester OR receiver OR admin)
CREATE POLICY f_read ON friendships FOR SELECT
  USING (requester_email = current_user_email() OR receiver_email = current_user_email() OR is_admin());
CREATE POLICY f_insert ON friendships FOR INSERT
  WITH CHECK (requester_email = current_user_email());
CREATE POLICY f_update ON friendships FOR UPDATE
  USING (requester_email = current_user_email() OR receiver_email = current_user_email() OR is_admin());
CREATE POLICY f_delete ON friendships FOR DELETE
  USING (requester_email = current_user_email() OR receiver_email = current_user_email() OR is_admin());

-- posts: read {} (público), create/update/delete (own OR admin)
CREATE POLICY p_read ON posts FOR SELECT USING (true);
CREATE POLICY p_insert ON posts FOR INSERT
  WITH CHECK (is_owner(created_by_id) OR is_admin());
CREATE POLICY p_update ON posts FOR UPDATE
  USING (is_owner(created_by_id) OR is_admin());
CREATE POLICY p_delete ON posts FOR DELETE
  USING (is_owner(created_by_id) OR is_admin());

-- comments: read {} (público), create/update/delete (own OR admin)
CREATE POLICY c_read ON comments FOR SELECT USING (true);
CREATE POLICY c_insert ON comments FOR INSERT
  WITH CHECK (is_owner(created_by_id) OR is_admin());
CREATE POLICY c_update ON comments FOR UPDATE
  USING (is_owner(created_by_id) OR is_admin());
CREATE POLICY c_delete ON comments FOR DELETE
  USING (is_owner(created_by_id) OR is_admin());

-- communities: read {} (público), create (creator), update/delete (creator OR admin)
CREATE POLICY com_read ON communities FOR SELECT USING (true);
CREATE POLICY com_insert ON communities FOR INSERT
  WITH CHECK (creator_email = current_user_email() OR is_admin());
CREATE POLICY com_update ON communities FOR UPDATE
  USING (creator_email = current_user_email() OR is_admin());
CREATE POLICY com_delete ON communities FOR DELETE
  USING (creator_email = current_user_email() OR is_admin());

-- social_events: read (public OR organizer OR participant OR admin), create (organizer), update/delete (organizer OR admin)
CREATE POLICY se_read ON social_events FOR SELECT
  USING (visibility = 'public' OR organizer_email = current_user_email()
    OR current_user_email() = ANY(participants) OR is_admin());
CREATE POLICY se_insert ON social_events FOR INSERT
  WITH CHECK (organizer_email = current_user_email() OR is_admin());
CREATE POLICY se_update ON social_events FOR UPDATE
  USING (organizer_email = current_user_email() OR is_admin());
CREATE POLICY se_delete ON social_events FOR DELETE
  USING (organizer_email = current_user_email() OR is_admin());

-- event_comments: read {} (público), create (author), update/delete (author OR admin)
CREATE POLICY ec_read ON event_comments FOR SELECT USING (true);
CREATE POLICY ec_insert ON event_comments FOR INSERT
  WITH CHECK (author_email = current_user_email() OR is_admin());
CREATE POLICY ec_update ON event_comments FOR UPDATE
  USING (author_email = current_user_email() OR is_admin());
CREATE POLICY ec_delete ON event_comments FOR DELETE
  USING (author_email = current_user_email() OR is_admin());

-- watch_togethers: read (initiator OR friend), create (initiator), update (initiator OR friend), delete (initiator)
CREATE POLICY wt_read ON watch_togethers FOR SELECT
  USING (initiator_email = current_user_email() OR friend_email = current_user_email());
CREATE POLICY wt_insert ON watch_togethers FOR INSERT
  WITH CHECK (initiator_email = current_user_email());
CREATE POLICY wt_update ON watch_togethers FOR UPDATE
  USING (initiator_email = current_user_email() OR friend_email = current_user_email());
CREATE POLICY wt_delete ON watch_togethers FOR DELETE
  USING (initiator_email = current_user_email());

-- direct_messages: read (sender OR receiver), create (sender), update (sender OR receiver), delete (sender)
CREATE POLICY dm_read ON direct_messages FOR SELECT
  USING (sender_email = current_user_email() OR receiver_email = current_user_email());
CREATE POLICY dm_insert ON direct_messages FOR INSERT
  WITH CHECK (sender_email = current_user_email());
CREATE POLICY dm_update ON direct_messages FOR UPDATE
  USING (sender_email = current_user_email() OR receiver_email = current_user_email());
CREATE POLICY dm_delete ON direct_messages FOR DELETE
  USING (sender_email = current_user_email());

-- notifications: read (recipient), update (recipient), delete (recipient OR admin)
CREATE POLICY n_read ON notifications FOR SELECT
  USING (recipient_email = current_user_email());
CREATE POLICY n_insert ON notifications FOR INSERT
  WITH CHECK (recipient_email = current_user_email() OR created_by_id IS NOT NULL);
CREATE POLICY n_update ON notifications FOR UPDATE
  USING (recipient_email = current_user_email());
CREATE POLICY n_delete ON notifications FOR DELETE
  USING (recipient_email = current_user_email() OR is_admin());

-- activity_feed: read (actor OR target OR admin), create/update/delete (own)
CREATE POLICY af_read ON activity_feed FOR SELECT
  USING (actor_email = current_user_email() OR target_email = current_user_email() OR is_admin());
CREATE POLICY af_insert ON activity_feed FOR INSERT
  WITH CHECK (is_owner(created_by_id));
CREATE POLICY af_update ON activity_feed FOR UPDATE
  USING (is_owner(created_by_id));
CREATE POLICY af_delete ON activity_feed FOR DELETE
  USING (is_owner(created_by_id));

-- debates: read {} (público), write admin
CREATE POLICY d_read ON debates FOR SELECT USING (true);
CREATE POLICY d_write ON debates FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- RLS POLICIES — CMS / ADMIN
-- ----------------------------------------------------------------------------

-- news: read (status = 'publicado' OR admin), write admin
CREATE POLICY news_read ON news FOR SELECT
  USING (status = 'publicado' OR is_admin());
CREATE POLICY news_write ON news FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- fan_art: read {} (público), write admin
CREATE POLICY fa_read ON fan_art FOR SELECT USING (true);
CREATE POLICY fa_write ON fan_art FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- platform_banners: read {} (público), write admin
CREATE POLICY pb_read ON platform_banners FOR SELECT USING (true);
CREATE POLICY pb_write ON platform_banners FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- login_background_images: read {} (público), write admin
CREATE POLICY lbi_read ON login_background_images FOR SELECT USING (true);
CREATE POLICY lbi_write ON login_background_images FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- site_config: read {} (público), write admin
CREATE POLICY sc_read_cfg ON site_config FOR SELECT USING (true);
CREATE POLICY sc_write_cfg ON site_config FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- work_suggestions: read (own OR admin), update/delete admin
CREATE POLICY ws_read ON work_suggestions FOR SELECT
  USING (suggested_by_email = current_user_email() OR is_admin());
CREATE POLICY ws_insert ON work_suggestions FOR INSERT
  WITH CHECK (suggested_by_email = current_user_email());
CREATE POLICY ws_update ON work_suggestions FOR UPDATE
  USING (is_admin());
CREATE POLICY ws_delete ON work_suggestions FOR DELETE
  USING (is_admin());

-- content_reports: read (own OR admin), update/delete admin
CREATE POLICY cr_read ON content_reports FOR SELECT
  USING (reported_by_email = current_user_email() OR is_admin());
CREATE POLICY cr_insert ON content_reports FOR INSERT
  WITH CHECK (reported_by_email = current_user_email());
CREATE POLICY cr_update ON content_reports FOR UPDATE
  USING (is_admin());
CREATE POLICY cr_delete ON content_reports FOR DELETE
  USING (is_admin());

-- id_mapping / url_mapping: admin only
CREATE POLICY im_read ON id_mapping FOR SELECT USING (is_admin());
CREATE POLICY im_write ON id_mapping FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY um_read ON url_mapping FOR SELECT USING (is_admin());
CREATE POLICY um_write ON url_mapping FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- RLS POLICIES — AUXILIARY
-- ----------------------------------------------------------------------------

-- user_roles: read (own OR admin), write admin
CREATE POLICY ur_read ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY ur_write ON user_roles FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 14. TRIGGERS (updated_date)
-- ============================================================================
CREATE TRIGGER trg_dynamic_works_updated BEFORE UPDATE ON dynamic_works
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_work_releases_updated BEFORE UPDATE ON work_releases
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_external_mappings_updated BEFORE UPDATE ON external_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_catalog_sync_updated BEFORE UPDATE ON catalog_sync
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_card_overrides_updated BEFORE UPDATE ON card_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_work_category_visibility_updated BEFORE UPDATE ON work_category_visibility
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_media_works_updated BEFORE UPDATE ON media_works
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_anime_entries_updated BEFORE UPDATE ON anime_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_achievements_updated BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_user_achievements_updated BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_xp_events_updated BEFORE UPDATE ON xp_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_sync_runs_updated BEFORE UPDATE ON sync_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_sync_logs_updated BEFORE UPDATE ON sync_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_sync_conflicts_updated BEFORE UPDATE ON sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_friendships_updated BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_social_events_updated BEFORE UPDATE ON social_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_event_comments_updated BEFORE UPDATE ON event_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_watch_togethers_updated BEFORE UPDATE ON watch_togethers
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_direct_messages_updated BEFORE UPDATE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_activity_feed_updated BEFORE UPDATE ON activity_feed
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_debates_updated BEFORE UPDATE ON debates
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_news_updated BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_fan_art_updated BEFORE UPDATE ON fan_art
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_platform_banners_updated BEFORE UPDATE ON platform_banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_login_background_images_updated BEFORE UPDATE ON login_background_images
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_site_config_updated BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_work_suggestions_updated BEFORE UPDATE ON work_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
CREATE TRIGGER trg_content_reports_updated BEFORE UPDATE ON content_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();

-- ============================================================================
-- 15. STORAGE BUCKETS (documentado — não executar upload)
-- ============================================================================
-- Criar via Supabase Dashboard ou via SQL:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('public-assets', 'public-assets', true);
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('private-assets', 'private-assets', false);
--
-- Storage RLS policies (aplicar após criar buckets):
--
-- CREATE POLICY "public-assets read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'public-assets');
-- CREATE POLICY "public-assets write" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'public-assets' AND is_admin());
-- CREATE POLICY "public-assets update" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'public-assets' AND is_admin());
-- CREATE POLICY "public-assets delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'public-assets' AND is_admin());
--
-- CREATE POLICY "private-assets read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'private-assets' AND auth.uid() = owner);
-- CREATE POLICY "private-assets write" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'private-assets' AND auth.uid() = owner);
-- ============================================================================

-- ============================================================================
-- FIM DO SCHEMA INICIAL
-- Total de tabelas: 34 (31 entidades + 3 auxiliares)
-- Total de FKs: 25
-- Total de índices: 48
-- Total de RLS policies: ~80
-- Total de ENUMs: 24
-- Total de triggers: 33
-- ============================================================================