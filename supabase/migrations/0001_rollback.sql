-- ============================================================================
-- AniZoku — Rollback Migration (0001)
-- ============================================================================
-- Remove apenas o schema criado em 0001_initial_schema.sql, em ordem segura.
-- NÃO remove auth.users, storage.buckets, ou extensões do sistema.
-- NÃO executar automaticamente — usar apenas se necessário reverter.
-- ============================================================================

-- ============================================================================
-- 1. REMOVER TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS trg_dynamic_works_updated ON dynamic_works;
DROP TRIGGER IF EXISTS trg_work_releases_updated ON work_releases;
DROP TRIGGER IF EXISTS trg_external_mappings_updated ON external_mappings;
DROP TRIGGER IF EXISTS trg_catalog_sync_updated ON catalog_sync;
DROP TRIGGER IF EXISTS trg_card_overrides_updated ON card_overrides;
DROP TRIGGER IF EXISTS trg_work_category_visibility_updated ON work_category_visibility;
DROP TRIGGER IF EXISTS trg_media_works_updated ON media_works;
DROP TRIGGER IF EXISTS trg_user_profiles_updated ON user_profiles;
DROP TRIGGER IF EXISTS trg_anime_entries_updated ON anime_entries;
DROP TRIGGER IF EXISTS trg_achievements_updated ON achievements;
DROP TRIGGER IF EXISTS trg_user_achievements_updated ON user_achievements;
DROP TRIGGER IF EXISTS trg_xp_events_updated ON xp_events;
DROP TRIGGER IF EXISTS trg_sync_runs_updated ON sync_runs;
DROP TRIGGER IF EXISTS trg_sync_logs_updated ON sync_logs;
DROP TRIGGER IF EXISTS trg_sync_conflicts_updated ON sync_conflicts;
DROP TRIGGER IF EXISTS trg_friendships_updated ON friendships;
DROP TRIGGER IF EXISTS trg_posts_updated ON posts;
DROP TRIGGER IF EXISTS trg_comments_updated ON comments;
DROP TRIGGER IF EXISTS trg_communities_updated ON communities;
DROP TRIGGER IF EXISTS trg_social_events_updated ON social_events;
DROP TRIGGER IF EXISTS trg_event_comments_updated ON event_comments;
DROP TRIGGER IF EXISTS trg_watch_togethers_updated ON watch_togethers;
DROP TRIGGER IF EXISTS trg_direct_messages_updated ON direct_messages;
DROP TRIGGER IF EXISTS trg_notifications_updated ON notifications;
DROP TRIGGER IF EXISTS trg_activity_feed_updated ON activity_feed;
DROP TRIGGER IF EXISTS trg_debates_updated ON debates;
DROP TRIGGER IF EXISTS trg_news_updated ON news;
DROP TRIGGER IF EXISTS trg_fan_art_updated ON fan_art;
DROP TRIGGER IF EXISTS trg_platform_banners_updated ON platform_banners;
DROP TRIGGER IF EXISTS trg_login_background_images_updated ON login_background_images;
DROP TRIGGER IF EXISTS trg_site_config_updated ON site_config;
DROP TRIGGER IF EXISTS trg_work_suggestions_updated ON work_suggestions;
DROP TRIGGER IF EXISTS trg_content_reports_updated ON content_reports;

-- ============================================================================
-- 2. REMOVER RLS POLICIES (automático ao DROP TABLE, mas explícito para clareza)
-- ============================================================================
-- Policies são removidas automaticamente quando a tabela é dropped.
-- Nenhuma ação necessária aqui.

-- ============================================================================
-- 3. REMOVER TABELAS (ordem reversa de dependência: child primeiro)
-- ============================================================================
-- CMS / Admin
DROP TABLE IF EXISTS content_reports;
DROP TABLE IF EXISTS work_suggestions;
DROP TABLE IF EXISTS site_config;
DROP TABLE IF EXISTS login_background_images;
DROP TABLE IF EXISTS platform_banners;
DROP TABLE IF EXISTS fan_art;
DROP TABLE IF EXISTS news;

-- Social
DROP TABLE IF EXISTS debates;
DROP TABLE IF EXISTS activity_feed;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS direct_messages;
DROP TABLE IF EXISTS watch_togethers;
DROP TABLE IF EXISTS event_comments;
DROP TABLE IF EXISTS social_events;
DROP TABLE IF EXISTS communities;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS friendships;

-- Sync
DROP TABLE IF EXISTS sync_conflicts;
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS sync_runs;

-- User / Progress
DROP TABLE IF EXISTS xp_events;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS anime_entries;
DROP TABLE IF EXISTS user_profiles;

-- Catalog
DROP TABLE IF EXISTS media_works;
DROP TABLE IF EXISTS work_category_visibility;
DROP TABLE IF EXISTS card_overrides;
DROP TABLE IF EXISTS catalog_sync;
DROP TABLE IF EXISTS external_mappings;
DROP TABLE IF EXISTS work_releases;
DROP TABLE IF EXISTS dynamic_works;

-- Auxiliary
DROP TABLE IF EXISTS url_mapping;
DROP TABLE IF EXISTS id_mapping;
DROP TABLE IF EXISTS user_roles;

-- ============================================================================
-- 4. REMOVER HELPER FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_owner(TEXT);
DROP FUNCTION IF EXISTS current_user_email();
DROP FUNCTION IF EXISTS set_updated_date();

-- ============================================================================
-- 5. REMOVER ENUM TYPES
-- ============================================================================
DROP TYPE IF EXISTS work_category;
DROP TYPE IF EXISTS work_release_status;
DROP TYPE IF EXISTS work_release_sync_status;
DROP TYPE IF EXISTS dynamic_work_sync_status;
DROP TYPE IF EXISTS provider_type;
DROP TYPE IF EXISTS anime_entry_type;
DROP TYPE IF EXISTS anime_entry_status;
DROP TYPE IF EXISTS catalog_sync_status;
DROP TYPE IF EXISTS sync_run_status;
DROP TYPE IF EXISTS sync_log_classification;
DROP TYPE IF EXISTS sync_conflict_type;
DROP TYPE IF EXISTS sync_conflict_action;
DROP TYPE IF EXISTS sync_conflict_status;
DROP TYPE IF EXISTS community_category;
DROP TYPE IF EXISTS post_type;
DROP TYPE IF EXISTS friendship_status;
DROP TYPE IF EXISTS watch_together_status;
DROP TYPE IF EXISTS watch_together_media_type;
DROP TYPE IF EXISTS social_event_type;
DROP TYPE IF EXISTS social_event_visibility;
DROP TYPE IF EXISTS social_event_status;
DROP TYPE IF EXISTS social_event_media_type;
DROP TYPE IF EXISTS activity_type;
DROP TYPE IF EXISTS xp_event_type;
DROP TYPE IF EXISTS news_category;
DROP TYPE IF EXISTS news_status;
DROP TYPE IF EXISTS news_video_type;
DROP TYPE IF EXISTS content_report_type;
DROP TYPE IF EXISTS content_report_reason;
DROP TYPE IF EXISTS content_report_status;
DROP TYPE IF EXISTS content_report_admin_action;
DROP TYPE IF EXISTS work_suggestion_status;
DROP TYPE IF EXISTS work_suggestion_type;
DROP TYPE IF EXISTS profile_visibility;
DROP TYPE IF EXISTS preferred_language;
DROP TYPE IF EXISTS notification_type;

-- ============================================================================
-- 6. NÃO REMOVER
-- ============================================================================
-- auth.users — gerenciado pelo Supabase Auth
-- storage.buckets — gerenciado pelo Supabase Storage
-- Extensões uuid-ossp, pgcrypto — podem ser usadas por outros schemas
-- ============================================================================
-- FIM DO ROLLBACK
-- ============================================================================