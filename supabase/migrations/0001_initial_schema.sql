-- AniZoku: canonical Supabase schema (initial migration, fresh schema only).
-- Source: src/lib/supabaseSchemaMapping.md sections 2, 4-7; XP hardening report.
-- UUIDs are canonical. legacy_base44_id is import metadata, never ownership.
-- No data import/reset, storage provisioning or deployment is performed here.
-- RPCs grant_xp/update_progress/unlock_achievement and friendship commands are
-- follow-up work. Their direct client writes remain DENIED in this foundation.
-- Use column GRANTs for field protection: RLS alone is row-level, not column-level.
-- Do not apply over an existing schema without a separate compatibility review.
BEGIN;

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  username text NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  avatar_crop jsonb,
  banner_url text,
  banner_crop jsonb,
  country text,
  preferred_language text NOT NULL DEFAULT 'pt' CHECK (preferred_language IN ('pt', 'en', 'es', 'ja', 'other')),
  links jsonb NOT NULL DEFAULT '{}',
  favorite_animes text[] NOT NULL DEFAULT '{}',
  favorite_mangas text[] NOT NULL DEFAULT '{}',
  selected_badge_id text,
  list_visibility text NOT NULL DEFAULT 'public' CHECK (list_visibility IN ('public', 'friends', 'private')),
  profile_visibility text NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  profile_setup_completed boolean NOT NULL DEFAULT false,
  profile_setup_completed_at timestamptz,
  push_enabled boolean NOT NULL DEFAULT false,
  achievement_sound_enabled boolean NOT NULL DEFAULT true,
  current_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  login_streak integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.works (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  slug text NOT NULL,
  title text NOT NULL,
  title_pt text,
  romaji_title text,
  franchise_id uuid,
  franchise_title text,
  franchise_score numeric(3,1),
  franchise_poster_url text,
  categories text[] NOT NULL DEFAULT '{}',
  genres text[] NOT NULL DEFAULT '{}',
  synopsis text,
  score numeric(3,1),
  year integer,
  is_trending boolean NOT NULL DEFAULT false,
  trending_rank integer,
  is_currently_airing boolean NOT NULL DEFAULT false,
  season text,
  season_year integer,
  sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'manual_override')),
  last_synced_at timestamptz,
  release_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_releases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  work_id uuid NOT NULL,
  work_slug text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  title_romaji text,
  title_english text,
  title_native text,
  category text NOT NULL CHECK (category IN ('anime', 'manga', 'movie', 'liveaction')),
  format text,
  season text,
  season_year integer,
  episode_count integer,
  chapter_count integer,
  duration_minutes integer,
  release_order integer,
  display_order integer,
  status text NOT NULL DEFAULT 'not_yet_released' CHECK (status IN ('releasing', 'finished', 'not_yet_released', 'cancelled', 'hiatus')),
  is_main_entry boolean NOT NULL DEFAULT false,
  is_special boolean NOT NULL DEFAULT false,
  is_movie boolean NOT NULL DEFAULT false,
  is_live_action boolean NOT NULL DEFAULT false,
  synopsis text,
  cover_url text,
  banner_url text,
  score numeric(3,1),
  popularity integer,
  trending_score integer NOT NULL DEFAULT 0,
  trending_rank integer,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'manual_override')),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.external_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  work_id uuid,
  work_release_id uuid,
  provider text NOT NULL CHECK (provider IN ('anilist', 'mal', 'tmdb', 'thetvdb')),
  provider_id text NOT NULL,
  provider_url text,
  provider_type text,
  confidence_score numeric(5,2) NOT NULL DEFAULT 100.00,
  verified_by_admin boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.anime_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  user_id uuid NOT NULL,
  work_id uuid,
  release_id uuid,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'anime' CHECK (type IN ('anime', 'manga')),
  cover_url text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('watching', 'reading', 'completed', 'planned', 'dropped', 'on_hold')),
  current_episode integer NOT NULL DEFAULT 0 CHECK (current_episode >= 0),
  total_episodes integer CHECK (total_episodes >= 0),
  current_chapter integer NOT NULL DEFAULT 0 CHECK (current_chapter >= 0),
  total_chapters integer CHECK (total_chapters >= 0),
  rating numeric(3,1),
  notes text,
  genre text,
  external_provider text,
  external_provider_id text,
  external_provider_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.xp_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('achievement_unlocked', 'level_up', 'episode_watched', 'chapter_read', 'post_created', 'work_completed', 'anime_added', 'legacy_migration')),
  achievement_id text,
  xp_amount integer NOT NULL DEFAULT 0,
  source_type text,
  source_id text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.achievements (
  key text NOT NULL PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  category text,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  requester_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  anime_title text,
  post_type text NOT NULL DEFAULT 'general' CHECK (post_type IN ('discussion', 'review', 'reaction', 'theory', 'general')),
  community_id uuid,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  author_name text,
  author_avatar text,
  author_level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  post_id uuid NOT NULL,
  parent_id uuid,
  author_id uuid NOT NULL,
  content text NOT NULL,
  author_name text,
  author_avatar text,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  recipient_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'post_liked', 'post_commented', 'event_invite', 'event_reminder', 'list_update', 'watch_together_invite', 'watch_together_near_5', 'watch_together_near_1', 'direct_message', 'mention', 'event_message')),
  message text NOT NULL,
  reference_type text,
  reference_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_feed (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  actor_id uuid NOT NULL,
  target_id uuid,
  activity_type text NOT NULL CHECK (activity_type IN ('watch_together_created', 'list_commented', 'event_invited', 'started_watching_together', 'friend_added')),
  media_title text,
  media_episode integer,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  name text NOT NULL,
  description text,
  cover_url text,
  avatar_url text,
  creator_id uuid,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('anime', 'manga', 'general', 'theories', 'reviews', 'news')),
  tags text[] NOT NULL DEFAULT '{}',
  members_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  title text NOT NULL,
  description text,
  media_title text,
  event_type text NOT NULL DEFAULT 'watch_episode' CHECK (event_type IN ('watch_episode', 'watch_marathon', 'read_chapter', 'debate', 'theory_night', 'watch_party')),
  media_type text NOT NULL DEFAULT 'anime' CHECK (media_type IN ('anime', 'manga')),
  event_date timestamptz NOT NULL,
  max_participants integer,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'happening', 'finished')),
  organizer_id uuid NOT NULL,
  organizer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  event_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.watch_together (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  initiator_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  initiator_name text,
  friend_name text,
  media_title text NOT NULL,
  work_id uuid,
  media_type text NOT NULL DEFAULT 'anime' CHECK (media_type IN ('anime', 'manga')),
  target_episode integer,
  target_chapter integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.debates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  title text NOT NULL,
  description text,
  anime_title text,
  author_name text,
  replies_count integer NOT NULL DEFAULT 0,
  is_hot boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.news (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  title text NOT NULL,
  slug text NOT NULL,
  summary text,
  content text,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('anime', 'manga', 'movie', 'liveaction', 'general')),
  banner_image_url text,
  card_image_url text,
  article_image_url text,
  video_type text NOT NULL DEFAULT 'none' CHECK (video_type IN ('none', 'embed', 'file')),
  video_url text,
  video_provider text,
  sources jsonb NOT NULL DEFAULT '[]',
  published_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  author_id uuid,
  author_name text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  reading_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fan_art (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  image_url text NOT NULL,
  title text,
  work_slug text,
  work_title text,
  artist_name text,
  artist_instagram text,
  artist_twitter text,
  artist_website text,
  source_url text,
  credit_notes text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  image_url text NOT NULL,
  title text,
  link_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.login_background_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  image_url text NOT NULL,
  title text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  label text NOT NULL DEFAULT 'default',
  logo_compact_url text,
  logo_full_url text,
  achievement_sound_url text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.card_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  work_slug text NOT NULL,
  category text CHECK (category IN ('anime', 'manga', 'movie', 'liveaction')),
  override_title text,
  override_description text,
  override_image_url text,
  is_manual_override boolean NOT NULL DEFAULT true,
  sync_disabled boolean NOT NULL DEFAULT true,
  edited_by uuid,
  edited_by_name text,
  edited_at timestamptz,
  original_snapshot jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_category_visibilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  work_slug text NOT NULL,
  work_title text,
  show_in_animes boolean NOT NULL DEFAULT true,
  show_in_mangas boolean NOT NULL DEFAULT true,
  show_in_liveaction boolean NOT NULL DEFAULT true,
  show_in_filmes boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  reported_by_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'reply', 'profile')),
  reference_id text NOT NULL,
  content_preview text,
  author_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam', 'hate_speech', 'nsfw', 'harassment', 'spoiler', 'misinformation', 'other')),
  description text,
  report_status text NOT NULL DEFAULT 'pending' CHECK (report_status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  admin_action text CHECK (admin_action IN ('warning', 'content_removed', 'user_warned', 'user_suspended')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_base44_id text UNIQUE,
  suggested_by_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('anime', 'manga')),
  mal_id integer NOT NULL,
  image_url text,
  synopsis text,
  year integer,
  score numeric(3,1),
  status text,
  episodes integer,
  chapters integer,
  genres text,
  mal_url text,
  suggestion_status text NOT NULL DEFAULT 'pending' CHECK (suggestion_status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD CONSTRAINT uq_profiles_username UNIQUE (username);
ALTER TABLE public.works ADD CONSTRAINT uq_works_slug UNIQUE (slug);
ALTER TABLE public.work_releases ADD CONSTRAINT uq_work_releases_work_id_slug UNIQUE (work_id, slug);
ALTER TABLE public.external_mappings ADD CONSTRAINT uq_external_mappings_provider_provider_id UNIQUE (provider, provider_id);
ALTER TABLE public.xp_events ADD CONSTRAINT uq_xp_events_user_id_idempotency_key UNIQUE (user_id, idempotency_key);
ALTER TABLE public.user_achievements ADD CONSTRAINT uq_user_achievements_user_id_achievement_key UNIQUE (user_id, achievement_key);
ALTER TABLE public.post_likes ADD CONSTRAINT uq_post_likes_user_id_post_id UNIQUE (user_id, post_id);
ALTER TABLE public.comment_likes ADD CONSTRAINT uq_comment_likes_user_id_comment_id UNIQUE (user_id, comment_id);
ALTER TABLE public.community_members ADD CONSTRAINT uq_community_members_community_id_user_id UNIQUE (community_id, user_id);
ALTER TABLE public.event_participants ADD CONSTRAINT uq_event_participants_event_id_user_id UNIQUE (event_id, user_id);
ALTER TABLE public.news ADD CONSTRAINT uq_news_slug UNIQUE (slug);
ALTER TABLE public.site_config ADD CONSTRAINT uq_site_config_label UNIQUE (label);
ALTER TABLE public.card_overrides ADD CONSTRAINT uq_card_overrides_work_slug_category UNIQUE (work_slug, category);
ALTER TABLE public.work_category_visibilities ADD CONSTRAINT uq_work_category_visibilities_work_slug UNIQUE (work_slug);
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_id
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_selected_badge_id
  FOREIGN KEY (selected_badge_id) REFERENCES public.achievements (key) ON DELETE SET NULL;
ALTER TABLE public.work_releases ADD CONSTRAINT fk_work_releases_work_id
  FOREIGN KEY (work_id) REFERENCES public.works (id) ON DELETE CASCADE;
ALTER TABLE public.external_mappings ADD CONSTRAINT fk_external_mappings_work_id
  FOREIGN KEY (work_id) REFERENCES public.works (id) ON DELETE CASCADE;
ALTER TABLE public.external_mappings ADD CONSTRAINT fk_external_mappings_work_release_id
  FOREIGN KEY (work_release_id) REFERENCES public.work_releases (id) ON DELETE CASCADE;
ALTER TABLE public.anime_entries ADD CONSTRAINT fk_anime_entries_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.anime_entries ADD CONSTRAINT fk_anime_entries_work_id
  FOREIGN KEY (work_id) REFERENCES public.works (id) ON DELETE SET NULL;
ALTER TABLE public.anime_entries ADD CONSTRAINT fk_anime_entries_release_id
  FOREIGN KEY (release_id) REFERENCES public.work_releases (id) ON DELETE SET NULL;
ALTER TABLE public.xp_events ADD CONSTRAINT fk_xp_events_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.xp_events ADD CONSTRAINT fk_xp_events_achievement_id
  FOREIGN KEY (achievement_id) REFERENCES public.achievements (key) ON DELETE SET NULL;
ALTER TABLE public.user_achievements ADD CONSTRAINT fk_user_achievements_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD CONSTRAINT fk_user_achievements_achievement_key
  FOREIGN KEY (achievement_key) REFERENCES public.achievements (key) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD CONSTRAINT fk_friendships_requester_id
  FOREIGN KEY (requester_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.friendships ADD CONSTRAINT fk_friendships_receiver_id
  FOREIGN KEY (receiver_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT fk_posts_author_id
  FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT fk_posts_community_id
  FOREIGN KEY (community_id) REFERENCES public.communities (id) ON DELETE SET NULL;
ALTER TABLE public.post_likes ADD CONSTRAINT fk_post_likes_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.post_likes ADD CONSTRAINT fk_post_likes_post_id
  FOREIGN KEY (post_id) REFERENCES public.posts (id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT fk_comments_post_id
  FOREIGN KEY (post_id) REFERENCES public.posts (id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT fk_comments_parent_id
  FOREIGN KEY (parent_id) REFERENCES public.comments (id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT fk_comments_author_id
  FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.comment_likes ADD CONSTRAINT fk_comment_likes_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.comment_likes ADD CONSTRAINT fk_comment_likes_comment_id
  FOREIGN KEY (comment_id) REFERENCES public.comments (id) ON DELETE CASCADE;
ALTER TABLE public.direct_messages ADD CONSTRAINT fk_direct_messages_sender_id
  FOREIGN KEY (sender_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.direct_messages ADD CONSTRAINT fk_direct_messages_receiver_id
  FOREIGN KEY (receiver_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_recipient_id
  FOREIGN KEY (recipient_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_actor_id
  FOREIGN KEY (actor_id) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.activity_feed ADD CONSTRAINT fk_activity_feed_actor_id
  FOREIGN KEY (actor_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.activity_feed ADD CONSTRAINT fk_activity_feed_target_id
  FOREIGN KEY (target_id) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD CONSTRAINT fk_communities_creator_id
  FOREIGN KEY (creator_id) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.community_members ADD CONSTRAINT fk_community_members_community_id
  FOREIGN KEY (community_id) REFERENCES public.communities (id) ON DELETE CASCADE;
ALTER TABLE public.community_members ADD CONSTRAINT fk_community_members_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT fk_events_organizer_id
  FOREIGN KEY (organizer_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.event_participants ADD CONSTRAINT fk_event_participants_event_id
  FOREIGN KEY (event_id) REFERENCES public.events (id) ON DELETE CASCADE;
ALTER TABLE public.event_participants ADD CONSTRAINT fk_event_participants_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.event_comments ADD CONSTRAINT fk_event_comments_event_id
  FOREIGN KEY (event_id) REFERENCES public.events (id) ON DELETE CASCADE;
ALTER TABLE public.event_comments ADD CONSTRAINT fk_event_comments_author_id
  FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.watch_together ADD CONSTRAINT fk_watch_together_initiator_id
  FOREIGN KEY (initiator_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.watch_together ADD CONSTRAINT fk_watch_together_friend_id
  FOREIGN KEY (friend_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.watch_together ADD CONSTRAINT fk_watch_together_work_id
  FOREIGN KEY (work_id) REFERENCES public.works (id) ON DELETE SET NULL;
ALTER TABLE public.news ADD CONSTRAINT fk_news_author_id
  FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.fan_art ADD CONSTRAINT fk_fan_art_work_slug
  FOREIGN KEY (work_slug) REFERENCES public.works (slug) ON DELETE SET NULL;
ALTER TABLE public.site_config ADD CONSTRAINT fk_site_config_updated_by
  FOREIGN KEY (updated_by) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.card_overrides ADD CONSTRAINT fk_card_overrides_work_slug
  FOREIGN KEY (work_slug) REFERENCES public.works (slug) ON DELETE CASCADE;
ALTER TABLE public.card_overrides ADD CONSTRAINT fk_card_overrides_edited_by
  FOREIGN KEY (edited_by) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.work_category_visibilities ADD CONSTRAINT fk_work_category_visibilities_work_slug
  FOREIGN KEY (work_slug) REFERENCES public.works (slug) ON DELETE CASCADE;
ALTER TABLE public.work_category_visibilities ADD CONSTRAINT fk_work_category_visibilities_updated_by
  FOREIGN KEY (updated_by) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.content_reports ADD CONSTRAINT fk_content_reports_reported_by_id
  FOREIGN KEY (reported_by_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.content_reports ADD CONSTRAINT fk_content_reports_author_id
  FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.work_suggestions ADD CONSTRAINT fk_work_suggestions_suggested_by_id
  FOREIGN KEY (suggested_by_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.works ADD CONSTRAINT fk_works_franchise_id
  FOREIGN KEY (franchise_id) REFERENCES public.works (id) ON DELETE SET NULL;

-- Business invariants; nullable legacy releases retain the documented exception.
CREATE UNIQUE INDEX uq_anime_entries_user_release ON public.anime_entries (user_id, release_id) WHERE release_id IS NOT NULL;
CREATE UNIQUE INDEX uq_friendships_pair ON public.friendships (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id));
ALTER TABLE public.friendships ADD CONSTRAINT ck_friendships_not_self CHECK (requester_id <> receiver_id);
ALTER TABLE public.watch_together ADD CONSTRAINT ck_watch_together_not_self CHECK (initiator_id <> friend_id);
ALTER TABLE public.external_mappings ADD CONSTRAINT ck_external_mapping_target CHECK (work_id IS NOT NULL OR work_release_id IS NOT NULL);
ALTER TABLE public.external_mappings ADD CONSTRAINT ck_mapping_confidence CHECK (confidence_score BETWEEN 0 AND 100);
ALTER TABLE public.anime_entries ADD CONSTRAINT ck_entry_rating CHECK (rating BETWEEN 1 AND 10);
ALTER TABLE public.xp_events ADD CONSTRAINT ck_xp_idempotency_key CHECK (length(btrim(idempotency_key)) > 0);
ALTER TABLE public.events ADD CONSTRAINT ck_event_capacity CHECK (max_participants > 0);
ALTER TABLE public.comments ADD CONSTRAINT ck_comment_parent CHECK (parent_id <> id);
ALTER TABLE public.comments ADD CONSTRAINT uq_comments_id_post UNIQUE (id, post_id);
-- Composite FK additionally prevents a reply from referring to another post.
ALTER TABLE public.comments ADD CONSTRAINT fk_comment_parent_post FOREIGN KEY (parent_id, post_id) REFERENCES public.comments (id, post_id) ON DELETE CASCADE;
-- Work slugs are an actual relation, maintained on rename, not an email-like identity.
ALTER TABLE public.works ADD CONSTRAINT uq_works_id_slug UNIQUE (id, slug);
ALTER TABLE public.work_releases ADD CONSTRAINT fk_release_work_slug FOREIGN KEY (work_id, work_slug) REFERENCES public.works (id, slug) ON UPDATE CASCADE ON DELETE CASCADE;
-- A NULL category represents one global override, not unlimited duplicate rows.
CREATE UNIQUE INDEX uq_card_override_global ON public.card_overrides (work_slug) WHERE category IS NULL;

ALTER TABLE public.profiles ADD CONSTRAINT ck_profiles_current_streak CHECK (current_streak >= 0);
ALTER TABLE public.profiles ADD CONSTRAINT ck_profiles_login_streak CHECK (login_streak >= 0);
ALTER TABLE public.works ADD CONSTRAINT ck_works_release_count CHECK (release_count >= 0);
ALTER TABLE public.work_releases ADD CONSTRAINT ck_work_releases_episode_count CHECK (episode_count >= 0);
ALTER TABLE public.work_releases ADD CONSTRAINT ck_work_releases_chapter_count CHECK (chapter_count >= 0);
ALTER TABLE public.work_releases ADD CONSTRAINT ck_work_releases_duration_minutes CHECK (duration_minutes >= 0);
ALTER TABLE public.xp_events ADD CONSTRAINT ck_xp_events_xp_amount CHECK (xp_amount >= 0);
ALTER TABLE public.achievements ADD CONSTRAINT ck_achievements_xp CHECK (xp >= 0);
ALTER TABLE public.posts ADD CONSTRAINT ck_posts_likes_count CHECK (likes_count >= 0);
ALTER TABLE public.posts ADD CONSTRAINT ck_posts_comments_count CHECK (comments_count >= 0);
ALTER TABLE public.comments ADD CONSTRAINT ck_comments_likes_count CHECK (likes_count >= 0);
ALTER TABLE public.communities ADD CONSTRAINT ck_communities_members_count CHECK (members_count >= 0);
ALTER TABLE public.watch_together ADD CONSTRAINT ck_watch_together_target_episode CHECK (target_episode >= 0);
ALTER TABLE public.watch_together ADD CONSTRAINT ck_watch_together_target_chapter CHECK (target_chapter >= 0);
ALTER TABLE public.debates ADD CONSTRAINT ck_debates_replies_count CHECK (replies_count >= 0);
CREATE INDEX idx_profiles_selected_badge_id ON public.profiles (selected_badge_id);
CREATE INDEX idx_work_releases_work_id ON public.work_releases (work_id);
CREATE INDEX idx_external_mappings_work_id ON public.external_mappings (work_id);
CREATE INDEX idx_external_mappings_work_release_id ON public.external_mappings (work_release_id);
CREATE INDEX idx_anime_entries_user_id ON public.anime_entries (user_id);
CREATE INDEX idx_anime_entries_work_id ON public.anime_entries (work_id);
CREATE INDEX idx_anime_entries_release_id ON public.anime_entries (release_id);
CREATE INDEX idx_xp_events_user_id ON public.xp_events (user_id);
CREATE INDEX idx_xp_events_achievement_id ON public.xp_events (achievement_id);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements (user_id);
CREATE INDEX idx_user_achievements_achievement_key ON public.user_achievements (achievement_key);
CREATE INDEX idx_friendships_requester_id ON public.friendships (requester_id);
CREATE INDEX idx_friendships_receiver_id ON public.friendships (receiver_id);
CREATE INDEX idx_posts_author_id ON public.posts (author_id);
CREATE INDEX idx_posts_community_id ON public.posts (community_id);
CREATE INDEX idx_post_likes_user_id ON public.post_likes (user_id);
CREATE INDEX idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX idx_comments_post_id ON public.comments (post_id);
CREATE INDEX idx_comments_parent_id ON public.comments (parent_id);
CREATE INDEX idx_comments_author_id ON public.comments (author_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes (user_id);
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes (comment_id);
CREATE INDEX idx_direct_messages_sender_id ON public.direct_messages (sender_id);
CREATE INDEX idx_direct_messages_receiver_id ON public.direct_messages (receiver_id);
CREATE INDEX idx_notifications_recipient_id ON public.notifications (recipient_id);
CREATE INDEX idx_notifications_actor_id ON public.notifications (actor_id);
CREATE INDEX idx_activity_feed_actor_id ON public.activity_feed (actor_id);
CREATE INDEX idx_activity_feed_target_id ON public.activity_feed (target_id);
CREATE INDEX idx_communities_creator_id ON public.communities (creator_id);
CREATE INDEX idx_community_members_community_id ON public.community_members (community_id);
CREATE INDEX idx_community_members_user_id ON public.community_members (user_id);
CREATE INDEX idx_events_organizer_id ON public.events (organizer_id);
CREATE INDEX idx_event_participants_event_id ON public.event_participants (event_id);
CREATE INDEX idx_event_participants_user_id ON public.event_participants (user_id);
CREATE INDEX idx_event_comments_event_id ON public.event_comments (event_id);
CREATE INDEX idx_event_comments_author_id ON public.event_comments (author_id);
CREATE INDEX idx_watch_together_initiator_id ON public.watch_together (initiator_id);
CREATE INDEX idx_watch_together_friend_id ON public.watch_together (friend_id);
CREATE INDEX idx_watch_together_work_id ON public.watch_together (work_id);
CREATE INDEX idx_news_author_id ON public.news (author_id);
CREATE INDEX idx_fan_art_work_slug ON public.fan_art (work_slug);
CREATE INDEX idx_site_config_updated_by ON public.site_config (updated_by);
CREATE INDEX idx_card_overrides_work_slug ON public.card_overrides (work_slug);
CREATE INDEX idx_card_overrides_edited_by ON public.card_overrides (edited_by);
CREATE INDEX idx_work_category_visibilities_work_slug ON public.work_category_visibilities (work_slug);
CREATE INDEX idx_work_category_visibilities_updated_by ON public.work_category_visibilities (updated_by);
CREATE INDEX idx_content_reports_reported_by_id ON public.content_reports (reported_by_id);
CREATE INDEX idx_content_reports_author_id ON public.content_reports (author_id);
CREATE INDEX idx_work_suggestions_suggested_by_id ON public.work_suggestions (suggested_by_id);
CREATE INDEX idx_works_franchise_id ON public.works (franchise_id);
CREATE INDEX idx_xp_user_created ON public.xp_events (user_id, created_at DESC);
CREATE INDEX idx_posts_created ON public.posts (created_at DESC);
CREATE INDEX idx_messages_conversation ON public.direct_messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at);
CREATE INDEX idx_notifications_unread ON public.notifications (recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_events_date ON public.events (event_date);

-- Authorization helpers never use emails, user-editable metadata, or a writable search_path.
CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
CREATE FUNCTION public.are_friends(other_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.friendships WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND receiver_id = other_user)
      OR (receiver_id = auth.uid() AND requester_id = other_user)));
$$;
-- Definer helper breaks events <-> participants policy recursion; identity is fixed by auth.uid().
CREATE FUNCTION public.can_view_event(event_uuid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_uuid AND
    (e.visibility = 'public' OR e.organizer_id = auth.uid() OR public.is_admin()
      OR (e.visibility = 'friends' AND public.are_friends(e.organizer_id))
      OR EXISTS (SELECT 1 FROM public.event_participants p WHERE p.event_id = e.id AND p.user_id = auth.uid())));
$$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Counter increments lock the parent row and are atomic under concurrent likes/comments.
-- Only fixed trigger arguments select the target table/column; clients cannot execute this function.
CREATE FUNCTION public.adjust_relation_counter() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_parent uuid; new_parent uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_parent := (to_jsonb(OLD) ->> TG_ARGV[2])::uuid; END IF;
  IF TG_OP <> 'DELETE' THEN new_parent := (to_jsonb(NEW) ->> TG_ARGV[2])::uuid; END IF;
  IF old_parent IS NOT DISTINCT FROM new_parent THEN RETURN NULL; END IF;
  IF old_parent IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I SET %I = %I - 1 WHERE id = $1', TG_ARGV[0], TG_ARGV[1], TG_ARGV[1]) USING old_parent;
  END IF;
  IF new_parent IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I SET %I = %I + 1 WHERE id = $1', TG_ARGV[0], TG_ARGV[1], TG_ARGV[1]) USING new_parent;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER count_post_likes AFTER INSERT OR UPDATE OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.adjust_relation_counter('posts', 'likes_count', 'post_id');
CREATE TRIGGER count_comments AFTER INSERT OR UPDATE OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.adjust_relation_counter('posts', 'comments_count', 'post_id');
CREATE TRIGGER count_comment_likes AFTER INSERT OR UPDATE OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.adjust_relation_counter('comments', 'likes_count', 'comment_id');
CREATE TRIGGER count_community_members AFTER INSERT OR UPDATE OR DELETE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.adjust_relation_counter('communities', 'members_count', 'community_id');
CREATE TRIGGER count_releases AFTER INSERT OR UPDATE OR DELETE ON public.work_releases FOR EACH ROW EXECUTE FUNCTION public.adjust_relation_counter('works', 'release_count', 'work_id');

CREATE FUNCTION public.snapshot_author() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE total_xp bigint; accumulated bigint := 0; needed bigint; author_level integer := 1;
BEGIN
  SELECT display_name, avatar_url INTO NEW.author_name, NEW.author_avatar FROM public.profiles WHERE id = NEW.author_id;
  IF TG_TABLE_NAME = 'posts' THEN
    SELECT coalesce(sum(xp_amount), 0) INTO total_xp FROM public.xp_events WHERE user_id = NEW.author_id;
    -- Same cumulative level curve as base44/shared/xpConstants.ts (cap 100).
    WHILE author_level < 100 LOOP
      needed := floor(100 * power(author_level::numeric, 1.6));
      EXIT WHEN accumulated + needed > total_xp;
      accumulated := accumulated + needed;
      author_level := author_level + 1;
    END LOOP;
    NEW.author_level := author_level;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER snapshot_post_author BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.snapshot_author();
CREATE TRIGGER snapshot_comment_author BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.snapshot_author();

-- Message content and endpoints are immutable even for backend UPDATEs.
-- Deletion via auth.users CASCADE remains possible for account removal.
CREATE FUNCTION public.protect_message() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
    RAISE EXCEPTION 'Only read_at may change on a direct message' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_message BEFORE UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.protect_message();

-- Serialize event joins to enforce capacity; no direct join of a private event.
-- Private invitations require a later server-side workflow.
CREATE FUNCTION public.check_event_join() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.events;
BEGIN
  SELECT * INTO e FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF e.max_participants IS NOT NULL AND (SELECT count(*) FROM public.event_participants WHERE event_id = e.id) >= e.max_participants THEN
    RAISE EXCEPTION 'Event is full' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_event_join BEFORE INSERT ON public.event_participants FOR EACH ROW EXECUTE FUNCTION public.check_event_join();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.works FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.work_releases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.external_mappings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.anime_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.watch_together FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.debates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fan_art FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.platform_banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.login_background_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.site_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.card_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.work_category_visibilities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.content_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.work_suggestions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS + explicit least-privilege API grants. No policy means deny, even for app admins.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.works FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.works TO service_role;
ALTER TABLE public.work_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.work_releases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_releases TO service_role;
ALTER TABLE public.external_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.external_mappings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_mappings TO service_role;
ALTER TABLE public.anime_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anime_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anime_entries TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xp_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_events TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_achievements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achievements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.friendships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_likes TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comment_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_likes TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.direct_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_feed FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_feed TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communities FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_members FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO service_role;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_participants FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO service_role;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_comments TO service_role;
ALTER TABLE public.watch_together ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.watch_together FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_together TO service_role;
ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.debates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debates TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.news FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO service_role;
ALTER TABLE public.fan_art ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fan_art FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fan_art TO service_role;
ALTER TABLE public.platform_banners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_banners FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_banners TO service_role;
ALTER TABLE public.login_background_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_background_images FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_background_images TO service_role;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO service_role;
ALTER TABLE public.card_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.card_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_overrides TO service_role;
ALTER TABLE public.work_category_visibilities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.work_category_visibilities FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_category_visibilities TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_reports TO service_role;
ALTER TABLE public.work_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.work_suggestions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_suggestions TO service_role;
GRANT SELECT ON public.works TO anon, authenticated;
CREATE POLICY works_select ON public.works FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (slug, title, title_pt, romaji_title, franchise_id, franchise_title, franchise_score, franchise_poster_url, categories, genres, synopsis, score, year, is_trending, trending_rank, is_currently_airing, season, season_year, sync_status, last_synced_at) ON public.works TO authenticated;
CREATE POLICY works_insert ON public.works FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (slug, title, title_pt, romaji_title, franchise_id, franchise_title, franchise_score, franchise_poster_url, categories, genres, synopsis, score, year, is_trending, trending_rank, is_currently_airing, season, season_year, sync_status, last_synced_at) ON public.works TO authenticated;
CREATE POLICY works_update ON public.works FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.works TO authenticated;
CREATE POLICY works_delete ON public.works FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.work_releases TO anon, authenticated;
CREATE POLICY work_releases_select ON public.work_releases FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (work_id, work_slug, slug, title, title_romaji, title_english, title_native, category, format, season, season_year, episode_count, chapter_count, duration_minutes, release_order, display_order, status, is_main_entry, is_special, is_movie, is_live_action, synopsis, cover_url, banner_url, score, popularity, trending_score, trending_rank, sync_status, last_synced_at) ON public.work_releases TO authenticated;
CREATE POLICY work_releases_insert ON public.work_releases FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (work_id, work_slug, slug, title, title_romaji, title_english, title_native, category, format, season, season_year, episode_count, chapter_count, duration_minutes, release_order, display_order, status, is_main_entry, is_special, is_movie, is_live_action, synopsis, cover_url, banner_url, score, popularity, trending_score, trending_rank, sync_status, last_synced_at) ON public.work_releases TO authenticated;
CREATE POLICY work_releases_update ON public.work_releases FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.work_releases TO authenticated;
CREATE POLICY work_releases_delete ON public.work_releases FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.external_mappings TO anon, authenticated;
CREATE POLICY external_mappings_select ON public.external_mappings FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (work_id, work_release_id, provider, provider_id, provider_url, provider_type, confidence_score, verified_by_admin, last_synced_at) ON public.external_mappings TO authenticated;
CREATE POLICY external_mappings_insert ON public.external_mappings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (work_id, work_release_id, provider, provider_id, provider_url, provider_type, confidence_score, verified_by_admin, last_synced_at) ON public.external_mappings TO authenticated;
CREATE POLICY external_mappings_update ON public.external_mappings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.external_mappings TO authenticated;
CREATE POLICY external_mappings_delete ON public.external_mappings FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.achievements TO anon, authenticated;
CREATE POLICY achievements_select ON public.achievements FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (key, name, description, icon, category, xp) ON public.achievements TO authenticated;
CREATE POLICY achievements_insert ON public.achievements FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (key, name, description, icon, category, xp) ON public.achievements TO authenticated;
CREATE POLICY achievements_update ON public.achievements FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.achievements TO authenticated;
CREATE POLICY achievements_delete ON public.achievements FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.debates TO anon, authenticated;
CREATE POLICY debates_select ON public.debates FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (title, description, anime_title, author_name, is_hot, tags) ON public.debates TO authenticated;
CREATE POLICY debates_insert ON public.debates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (title, description, anime_title, author_name, is_hot, tags) ON public.debates TO authenticated;
CREATE POLICY debates_update ON public.debates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.debates TO authenticated;
CREATE POLICY debates_delete ON public.debates FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.news TO anon, authenticated;
CREATE POLICY news_select ON public.news FOR SELECT TO anon, authenticated USING (status = 'publicado' OR public.is_admin());
GRANT INSERT (title, slug, summary, content, category, banner_image_url, card_image_url, article_image_url, video_type, video_url, video_provider, sources, published_at, is_featured, author_id, author_name, status, reading_minutes) ON public.news TO authenticated;
CREATE POLICY news_insert ON public.news FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (title, slug, summary, content, category, banner_image_url, card_image_url, article_image_url, video_type, video_url, video_provider, sources, published_at, is_featured, author_id, author_name, status, reading_minutes) ON public.news TO authenticated;
CREATE POLICY news_update ON public.news FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.news TO authenticated;
CREATE POLICY news_delete ON public.news FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.fan_art TO anon, authenticated;
CREATE POLICY fan_art_select ON public.fan_art FOR SELECT TO anon, authenticated USING (active OR public.is_admin());
GRANT INSERT (image_url, title, work_slug, work_title, artist_name, artist_instagram, artist_twitter, artist_website, source_url, credit_notes, active, sort_order) ON public.fan_art TO authenticated;
CREATE POLICY fan_art_insert ON public.fan_art FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (image_url, title, work_slug, work_title, artist_name, artist_instagram, artist_twitter, artist_website, source_url, credit_notes, active, sort_order) ON public.fan_art TO authenticated;
CREATE POLICY fan_art_update ON public.fan_art FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.fan_art TO authenticated;
CREATE POLICY fan_art_delete ON public.fan_art FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.platform_banners TO anon, authenticated;
CREATE POLICY platform_banners_select ON public.platform_banners FOR SELECT TO anon, authenticated USING (active OR public.is_admin());
GRANT INSERT (image_url, title, link_url, active, sort_order) ON public.platform_banners TO authenticated;
CREATE POLICY platform_banners_insert ON public.platform_banners FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (image_url, title, link_url, active, sort_order) ON public.platform_banners TO authenticated;
CREATE POLICY platform_banners_update ON public.platform_banners FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.platform_banners TO authenticated;
CREATE POLICY platform_banners_delete ON public.platform_banners FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.login_background_images TO anon, authenticated;
CREATE POLICY login_background_images_select ON public.login_background_images FOR SELECT TO anon, authenticated USING (active OR public.is_admin());
GRANT INSERT (image_url, title, active, sort_order) ON public.login_background_images TO authenticated;
CREATE POLICY login_background_images_insert ON public.login_background_images FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (image_url, title, active, sort_order) ON public.login_background_images TO authenticated;
CREATE POLICY login_background_images_update ON public.login_background_images FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.login_background_images TO authenticated;
CREATE POLICY login_background_images_delete ON public.login_background_images FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.site_config TO anon, authenticated;
CREATE POLICY site_config_select ON public.site_config FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (label, logo_compact_url, logo_full_url, achievement_sound_url, updated_by) ON public.site_config TO authenticated;
CREATE POLICY site_config_insert ON public.site_config FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (label, logo_compact_url, logo_full_url, achievement_sound_url, updated_by) ON public.site_config TO authenticated;
CREATE POLICY site_config_update ON public.site_config FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.site_config TO authenticated;
CREATE POLICY site_config_delete ON public.site_config FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.card_overrides TO anon, authenticated;
CREATE POLICY card_overrides_select ON public.card_overrides FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (work_slug, category, override_title, override_description, override_image_url, is_manual_override, sync_disabled, edited_by, edited_by_name, edited_at, original_snapshot, notes) ON public.card_overrides TO authenticated;
CREATE POLICY card_overrides_insert ON public.card_overrides FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (work_slug, category, override_title, override_description, override_image_url, is_manual_override, sync_disabled, edited_by, edited_by_name, edited_at, original_snapshot, notes) ON public.card_overrides TO authenticated;
CREATE POLICY card_overrides_update ON public.card_overrides FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.card_overrides TO authenticated;
CREATE POLICY card_overrides_delete ON public.card_overrides FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.work_category_visibilities TO anon, authenticated;
CREATE POLICY work_category_visibilities_select ON public.work_category_visibilities FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (work_slug, work_title, show_in_animes, show_in_mangas, show_in_liveaction, show_in_filmes, updated_by) ON public.work_category_visibilities TO authenticated;
CREATE POLICY work_category_visibilities_insert ON public.work_category_visibilities FOR INSERT TO authenticated WITH CHECK (public.is_admin());
GRANT UPDATE (work_slug, work_title, show_in_animes, show_in_mangas, show_in_liveaction, show_in_filmes, updated_by) ON public.work_category_visibilities TO authenticated;
CREATE POLICY work_category_visibilities_update ON public.work_category_visibilities FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.work_category_visibilities TO authenticated;
CREATE POLICY work_category_visibilities_delete ON public.work_category_visibilities FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.profiles TO anon, authenticated;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO anon, authenticated USING (id = auth.uid() OR public.is_admin() OR profile_visibility = 'public' OR (profile_visibility = 'friends' AND public.are_friends(id)));
GRANT INSERT (id, username, display_name, bio, avatar_url, avatar_crop, banner_url, banner_crop, country, preferred_language, links, favorite_animes, favorite_mangas, selected_badge_id, list_visibility, profile_visibility, profile_setup_completed, profile_setup_completed_at, push_enabled, achievement_sound_enabled) ON public.profiles TO authenticated;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
GRANT UPDATE (username, display_name, bio, avatar_url, avatar_crop, banner_url, banner_crop, country, preferred_language, links, favorite_animes, favorite_mangas, selected_badge_id, list_visibility, profile_visibility, profile_setup_completed, profile_setup_completed_at, push_enabled, achievement_sound_enabled) ON public.profiles TO authenticated;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
GRANT DELETE ON public.profiles TO authenticated;
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());
GRANT SELECT ON public.anime_entries TO authenticated;
CREATE POLICY anime_entries_select ON public.anime_entries FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
GRANT INSERT (user_id, work_id, release_id, title, type, cover_url, rating, notes, genre, external_provider, external_provider_id, external_provider_type) ON public.anime_entries TO authenticated;
CREATE POLICY anime_entries_insert ON public.anime_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT DELETE ON public.anime_entries TO authenticated;
CREATE POLICY anime_entries_delete ON public.anime_entries FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.xp_events TO authenticated;
CREATE POLICY xp_events_select ON public.xp_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.user_achievements TO authenticated;
CREATE POLICY user_achievements_select ON public.user_achievements FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.friendships TO authenticated;
CREATE POLICY friendships_select ON public.friendships FOR SELECT TO authenticated USING (requester_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.posts TO anon, authenticated;
CREATE POLICY posts_select ON public.posts FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (author_id, content, image_url, anime_title, post_type, community_id) ON public.posts TO authenticated;
CREATE POLICY posts_insert ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
GRANT UPDATE (content, image_url, anime_title, post_type, community_id) ON public.posts TO authenticated;
CREATE POLICY posts_update ON public.posts FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_admin()) WITH CHECK (author_id = auth.uid() OR public.is_admin());
GRANT DELETE ON public.posts TO authenticated;
CREATE POLICY posts_delete ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.comments TO anon, authenticated;
CREATE POLICY comments_select ON public.comments FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (post_id, parent_id, author_id, content) ON public.comments TO authenticated;
CREATE POLICY comments_insert ON public.comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
GRANT UPDATE (content) ON public.comments TO authenticated;
CREATE POLICY comments_update ON public.comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_admin()) WITH CHECK (author_id = auth.uid() OR public.is_admin());
GRANT DELETE ON public.comments TO authenticated;
CREATE POLICY comments_delete ON public.comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.communities TO anon, authenticated;
CREATE POLICY communities_select ON public.communities FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (name, description, cover_url, avatar_url, creator_id, category, tags) ON public.communities TO authenticated;
CREATE POLICY communities_insert ON public.communities FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
GRANT UPDATE (name, description, cover_url, avatar_url, category, tags) ON public.communities TO authenticated;
CREATE POLICY communities_update ON public.communities FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR public.is_admin()) WITH CHECK (creator_id = auth.uid() OR public.is_admin());
GRANT DELETE ON public.communities TO authenticated;
CREATE POLICY communities_delete ON public.communities FOR DELETE TO authenticated USING (creator_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.post_likes TO anon, authenticated;
CREATE POLICY post_likes_select ON public.post_likes FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (user_id, post_id) ON public.post_likes TO authenticated;
CREATE POLICY post_likes_insert ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT DELETE ON public.post_likes TO authenticated;
CREATE POLICY post_likes_delete ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.comment_likes TO anon, authenticated;
CREATE POLICY comment_likes_select ON public.comment_likes FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (user_id, comment_id) ON public.comment_likes TO authenticated;
CREATE POLICY comment_likes_insert ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT DELETE ON public.comment_likes TO authenticated;
CREATE POLICY comment_likes_delete ON public.comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.community_members TO anon, authenticated;
CREATE POLICY community_members_select ON public.community_members FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT (user_id, community_id) ON public.community_members TO authenticated;
CREATE POLICY community_members_insert ON public.community_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT DELETE ON public.community_members TO authenticated;
CREATE POLICY community_members_delete ON public.community_members FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.events TO anon, authenticated;
CREATE POLICY events_select ON public.events FOR SELECT TO anon, authenticated USING (public.can_view_event(id));
GRANT INSERT (title, description, media_title, event_type, media_type, event_date, max_participants, visibility, status, organizer_id) ON public.events TO authenticated;
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
GRANT UPDATE (title, description, media_title, event_type, media_type, event_date, max_participants, visibility, status) ON public.events TO authenticated;
CREATE POLICY events_update ON public.events FOR UPDATE TO authenticated USING (organizer_id = auth.uid() OR public.is_admin()) WITH CHECK (organizer_id = auth.uid() OR public.is_admin());
GRANT DELETE ON public.events TO authenticated;
CREATE POLICY events_delete ON public.events FOR DELETE TO authenticated USING (organizer_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.event_participants TO authenticated;
CREATE POLICY event_participants_select ON public.event_participants FOR SELECT TO authenticated USING (public.can_view_event(event_id));
GRANT INSERT (event_id, user_id) ON public.event_participants TO authenticated;
CREATE POLICY event_participants_insert ON public.event_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status <> 'finished' AND (e.visibility = 'public' OR e.organizer_id = auth.uid() OR (e.visibility = 'friends' AND public.are_friends(e.organizer_id)))));
GRANT DELETE ON public.event_participants TO authenticated;
CREATE POLICY event_participants_delete ON public.event_participants FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.event_comments TO anon, authenticated;
CREATE POLICY event_comments_select ON public.event_comments FOR SELECT TO anon, authenticated USING (public.can_view_event(event_id));
GRANT INSERT (event_id, author_id, content) ON public.event_comments TO authenticated;
CREATE POLICY event_comments_insert ON public.event_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.can_view_event(event_id));
GRANT UPDATE (content) ON public.event_comments TO authenticated;
CREATE POLICY event_comments_update ON public.event_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() AND public.can_view_event(event_id)) WITH CHECK (author_id = auth.uid() AND public.can_view_event(event_id));
GRANT DELETE ON public.event_comments TO authenticated;
CREATE POLICY event_comments_delete ON public.event_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.direct_messages TO authenticated;
CREATE POLICY direct_messages_select ON public.direct_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
GRANT INSERT (sender_id, receiver_id, content) ON public.direct_messages TO authenticated;
CREATE POLICY direct_messages_insert ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
GRANT UPDATE (read_at) ON public.direct_messages TO authenticated;
CREATE POLICY direct_messages_update ON public.direct_messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());
GRANT SELECT ON public.notifications TO authenticated;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
GRANT DELETE ON public.notifications TO authenticated;
CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.activity_feed TO authenticated;
CREATE POLICY activity_feed_select ON public.activity_feed FOR SELECT TO authenticated USING (actor_id = auth.uid() OR target_id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.watch_together TO authenticated;
CREATE POLICY watch_together_select ON public.watch_together FOR SELECT TO authenticated USING (initiator_id = auth.uid() OR friend_id = auth.uid());
GRANT INSERT (initiator_id, friend_id, media_title, work_id, media_type, target_episode, target_chapter) ON public.watch_together TO authenticated;
CREATE POLICY watch_together_insert ON public.watch_together FOR INSERT TO authenticated WITH CHECK (initiator_id = auth.uid());
GRANT DELETE ON public.watch_together TO authenticated;
CREATE POLICY watch_together_delete ON public.watch_together FOR DELETE TO authenticated USING (initiator_id = auth.uid());
GRANT SELECT ON public.content_reports TO authenticated;
CREATE POLICY content_reports_select ON public.content_reports FOR SELECT TO authenticated USING (reported_by_id = auth.uid() OR public.is_admin());
GRANT INSERT (reported_by_id, content_type, reference_id, content_preview, author_id, reason, description) ON public.content_reports TO authenticated;
CREATE POLICY content_reports_insert ON public.content_reports FOR INSERT TO authenticated WITH CHECK (reported_by_id = auth.uid());
GRANT UPDATE (report_status, admin_action, admin_note, reviewed_at) ON public.content_reports TO authenticated;
CREATE POLICY content_reports_update ON public.content_reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.content_reports TO authenticated;
CREATE POLICY content_reports_delete ON public.content_reports FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT ON public.work_suggestions TO authenticated;
CREATE POLICY work_suggestions_select ON public.work_suggestions FOR SELECT TO authenticated USING (suggested_by_id = auth.uid() OR public.is_admin());
GRANT INSERT (suggested_by_id, title, type, mal_id, image_url, synopsis, year, score, status, episodes, chapters, genres, mal_url) ON public.work_suggestions TO authenticated;
CREATE POLICY work_suggestions_insert ON public.work_suggestions FOR INSERT TO authenticated WITH CHECK (suggested_by_id = auth.uid());
GRANT UPDATE (suggestion_status, admin_note, reviewed_at) ON public.work_suggestions TO authenticated;
CREATE POLICY work_suggestions_update ON public.work_suggestions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT DELETE ON public.work_suggestions TO authenticated;
CREATE POLICY work_suggestions_delete ON public.work_suggestions FOR DELETE TO authenticated USING (public.is_admin());
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.are_friends(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_view_event(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_relation_counter() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_author() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_event_join() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_event(uuid) TO anon, authenticated, service_role;

-- NOT IMPLEMENTED HERE: the eight business RPCs listed in mapping section 7.
-- Future RPCs must use auth.uid(), fixed search_path, explicit EXECUTE grants,
-- row locking, server-calculated rewards/keys, and one transaction for progress + XP.
-- No callable stubs, direct ledger writes, or generic client grant-XP escape hatches.
-- Import must resolve UUIDs and duplicate slugs before inserting catalog rows.
-- Achievement keys are the only natural TEXT entity PK (stable catalog keys).
-- Arrays retained here are value attributes explicitly present in section 4,
-- never members/participants/likes/email relationships.
COMMIT;
