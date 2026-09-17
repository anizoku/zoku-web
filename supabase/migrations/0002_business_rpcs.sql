-- AniZoku: exactly eight business RPCs over the canonical 0001 schema.
-- No seed/import, table/policy changes, deployment or database execution.
-- Sources: supabaseSchemaMapping.md section 7, xpSecurityHardeningReport.md,
-- base44/shared/xpConstants.ts, backend unlockAchievement and achievements.js.
-- Every identity comes from auth.uid(); all results are JSONB.
-- Expected validation failures return a status before any writes. Unexpected
-- SQL errors propagate, rolling back the entire invocation (no catch-all).
-- XP lock order is profiles -> source row -> catalog row. The profile lock
-- serializes XP/streak/achievement decisions for the same user.
BEGIN;

CREATE FUNCTION public.update_progress(entry_id uuid, action text, value integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry_id uuid := $1;
  v_action text := $2;
  v_value integer := $3;
  v_entry public.anime_entries%ROWTYPE;
  v_release public.work_releases%ROWTYPE;
  v_old integer;
  v_new bigint;
  v_total integer;
  v_airing boolean := false;
  v_status text;
  v_completed boolean;
  v_unit_xp integer;
  v_completion_reward integer;
  v_xp bigint := 0;
  v_completion_xp integer := 0;
  v_source text;
  v_prefix text;
  v_event text;
  v_today date := (statement_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_entry_id IS NULL OR v_action IS NULL THEN
    RETURN jsonb_build_object('status', 'INVALID_PARAMS');
  END IF;
  IF v_action NOT IN ('increment', 'decrement', 'set_progress', 'complete') THEN
    RETURN jsonb_build_object('status', 'INVALID_ACTION');
  END IF;
  IF (v_action = 'set_progress' AND (v_value IS NULL OR v_value < 0))
     OR (v_action <> 'set_progress' AND v_value IS NOT NULL) THEN
    RETURN jsonb_build_object('status', 'INVALID_VALUE');
  END IF;

  PERFORM 1 FROM public.profiles p WHERE p.id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'PROFILE_REQUIRED'); END IF;
  SELECT e.* INTO v_entry FROM public.anime_entries e
    WHERE e.id = v_entry_id AND e.user_id = v_user FOR UPDATE;
  -- Do not disclose the existence of another user's entry.
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'SOURCE_NOT_FOUND'); END IF;

  IF v_entry.release_id IS NOT NULL THEN
    SELECT r.* INTO v_release FROM public.work_releases r
      WHERE r.id = v_entry.release_id FOR SHARE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'SOURCE_NOT_FOUND'); END IF;
    IF (v_entry.type = 'manga') IS DISTINCT FROM (v_release.category = 'manga')
       OR (v_entry.work_id IS NOT NULL AND v_entry.work_id <> v_release.work_id) THEN
      RETURN jsonb_build_object('status', 'SOURCE_MISMATCH');
    END IF;
    v_airing := v_release.status = 'releasing';
  END IF;

  IF v_entry.type = 'manga' THEN
    v_old := v_entry.current_chapter;
    -- NULL alone means unknown. A canonical zero must never use a larger fallback.
    v_total := coalesce(v_release.chapter_count, v_entry.total_chapters);
    v_unit_xp := 7; v_completion_reward := 100;
    v_prefix := 'chapter:'; v_event := 'chapter_read';
  ELSE
    v_old := v_entry.current_episode;
    v_total := coalesce(v_release.episode_count, v_entry.total_episodes);
    v_unit_xp := 10; v_completion_reward := 150;
    v_prefix := 'episode:'; v_event := 'episode_watched';
  END IF;
  v_new := CASE v_action
    WHEN 'increment' THEN v_old::bigint + 1
    WHEN 'decrement' THEN greatest(0, v_old - 1)
    WHEN 'set_progress' THEN v_value
    WHEN 'complete' THEN v_total END;

  IF v_action = 'complete' AND (v_total IS NULL OR v_total <= 0) THEN
    RETURN jsonb_build_object('status', 'TOTAL_UNKNOWN', 'progress', v_old);
  END IF;
  IF v_new > v_old AND v_total IS NULL THEN
    RETURN jsonb_build_object('status', 'TOTAL_UNKNOWN', 'progress', v_old);
  END IF;
  -- A catalog correction must still allow decrementing an old excessive value.
  IF v_new > 2147483647 OR (v_total IS NOT NULL AND v_new > v_total AND v_new >= v_old) THEN
    RETURN jsonb_build_object('status', 'OUT_OF_RANGE', 'progress', v_old);
  END IF;
  IF v_new - v_old > 10000 THEN
    RETURN jsonb_build_object('status', 'BATCH_TOO_LARGE', 'max_units', 10000, 'progress', v_old);
  END IF;

  v_status := v_entry.status;
  IF v_action = 'complete' OR (NOT v_airing AND v_total > 0 AND v_new = v_total) THEN
    v_status := 'completed';
  ELSIF v_entry.status = 'completed' AND v_new < v_old THEN
    v_status := CASE WHEN v_entry.type = 'manga' THEN 'reading' ELSE 'watching' END;
  END IF;
  v_completed := v_status = 'completed';

  -- Canonical release identity survives deleting/re-adding a list entry. Entry
  -- UUID is the fallback only for backend-provisioned entries without a release.
  -- source_id retains the entry UUID for audit; clients cannot supply XP keys.
  v_source := CASE WHEN v_entry.release_id IS NOT NULL
    THEN 'release:' || v_entry.release_id::text ELSE 'entry:' || v_entry.id::text END;

  UPDATE public.anime_entries e SET
    current_episode = CASE WHEN v_entry.type = 'anime' THEN v_new::integer ELSE e.current_episode END,
    current_chapter = CASE WHEN v_entry.type = 'manga' THEN v_new::integer ELSE e.current_chapter END,
    total_episodes = CASE WHEN v_entry.type = 'anime' THEN v_total ELSE e.total_episodes END,
    total_chapters = CASE WHEN v_entry.type = 'manga' THEN v_total ELSE e.total_chapters END,
    status = v_status
    WHERE e.id = v_entry.id AND e.user_id = v_user;

  IF v_new > v_old THEN
    WITH awarded AS (
      INSERT INTO public.xp_events (user_id, event_type, xp_amount, source_type, source_id, idempotency_key)
      SELECT v_user, v_event, v_unit_xp, 'anime_entry', v_entry.id::text,
        v_prefix || v_source || ':' || units.n::text
      FROM generate_series(v_old + 1, v_new::integer) AS units(n)
      ON CONFLICT ON CONSTRAINT uq_xp_events_user_id_idempotency_key DO NOTHING
      RETURNING xp_amount
    ) SELECT coalesce(sum(a.xp_amount), 0) INTO v_xp FROM awarded a;
  END IF;
  -- Decreasing progress never creates completion XP, including corrected totals.
  IF v_completed AND v_total > 0 AND v_new = v_total AND v_new >= v_old
     AND v_action <> 'decrement' THEN
    INSERT INTO public.xp_events (user_id, event_type, xp_amount, source_type, source_id, idempotency_key)
      VALUES (v_user, 'work_completed', v_completion_reward, 'anime_entry', v_entry.id::text, 'completion:' || v_source)
      ON CONFLICT ON CONSTRAINT uq_xp_events_user_id_idempotency_key DO NOTHING
      RETURNING xp_amount INTO v_completion_xp;
    v_completion_xp := coalesce(v_completion_xp, 0);
  END IF;
  IF v_xp + v_completion_xp > 0 THEN
    UPDATE public.profiles p SET
      current_streak = CASE WHEN p.last_activity_date = v_today - 1 THEN p.current_streak + 1 ELSE 1 END,
      last_activity_date = v_today
      WHERE p.id = v_user AND (p.last_activity_date IS NULL OR p.last_activity_date < v_today);
  END IF;
  RETURN jsonb_build_object(
    'status', CASE WHEN v_xp + v_completion_xp > 0 THEN 'GRANTED' ELSE 'ALREADY_GRANTED' END,
    'progress', v_new, 'xp_granted', v_xp, 'completion_xp_granted', v_completion_xp,
    'total_xp_granted', v_xp + v_completion_xp, 'completed', v_completed,
    'status_changed', v_status <> v_entry.status);
END;
$$;

CREATE FUNCTION public.grant_xp(event_type text, source_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_type text := $1;
  v_source text := $2;
  v_uuid uuid;
  v_entry public.anime_entries%ROWTYPE;
  v_key text;
  v_source_type text;
  v_reward integer;
  v_granted integer;
  v_total_xp bigint;
  v_accumulated bigint := 0;
  v_needed bigint;
  v_level integer := 1;
  v_today date := (statement_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  -- No progress, range, completion or achievement event is accepted here.
  IF v_type IS NULL OR v_type NOT IN ('post_created', 'anime_added', 'level_up', 'legacy_migration') THEN
    RETURN jsonb_build_object('status', 'INVALID_EVENT_TYPE');
  END IF;
  IF v_type = 'legacy_migration' THEN
    IF NOT public.is_admin() THEN RETURN jsonb_build_object('status', 'FORBIDDEN'); END IF;
    -- 0001 contains no trusted baseline source. Never turn source_id into an XP
    -- amount or reconstruct pre-reset test XP. A reviewed import is separate work.
    RETURN jsonb_build_object('status', 'LEGACY_MIGRATION_DISABLED');
  END IF;
  PERFORM 1 FROM public.profiles p WHERE p.id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'PROFILE_REQUIRED'); END IF;

  IF v_type IN ('post_created', 'anime_added') THEN
    IF v_source IS NULL THEN RETURN jsonb_build_object('status', 'INVALID_SOURCE'); END IF;
    BEGIN
      v_uuid := v_source::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('status', 'INVALID_SOURCE');
    END;
    v_source := v_uuid::text;
    IF v_type = 'post_created' THEN
      PERFORM 1 FROM public.posts p WHERE p.id = v_uuid AND p.author_id = v_user FOR SHARE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'SOURCE_NOT_FOUND'); END IF;
      v_reward := 20; v_source_type := 'post'; v_key := 'post:' || v_source || ':create';
    ELSE
      SELECT e.* INTO v_entry FROM public.anime_entries e
        WHERE e.id = v_uuid AND e.user_id = v_user FOR SHARE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'SOURCE_NOT_FOUND'); END IF;
      v_reward := 15; v_source_type := 'anime_entry';
      v_key := CASE WHEN v_entry.release_id IS NOT NULL
        THEN 'entry:release:' || v_entry.release_id::text || ':created'
        ELSE 'entry:' || v_source || ':created' END;
    END IF;
  ELSE
    -- Level is derived from the ledger, never accepted as a client claim.
    IF v_source IS NOT NULL THEN RETURN jsonb_build_object('status', 'INVALID_SOURCE'); END IF;
    SELECT coalesce(sum(x.xp_amount), 0) INTO v_total_xp FROM public.xp_events x WHERE x.user_id = v_user;
    WHILE v_level < 100 LOOP
      v_needed := floor(100 * power(v_level::numeric, 1.6));
      EXIT WHEN v_accumulated + v_needed > v_total_xp;
      v_accumulated := v_accumulated + v_needed; v_level := v_level + 1;
    END LOOP;
    IF v_level < 2 THEN RETURN jsonb_build_object('status', 'CONDITION_NOT_MET'); END IF;
    v_reward := 0; v_source_type := 'level_up'; v_source := v_level::text;
    v_key := 'levelup:' || v_user::text || ':' || v_level::text;
  END IF;

  INSERT INTO public.xp_events (user_id, event_type, xp_amount, source_type, source_id, idempotency_key)
    VALUES (v_user, v_type, v_reward, v_source_type, v_source, v_key)
    ON CONFLICT ON CONSTRAINT uq_xp_events_user_id_idempotency_key DO NOTHING
    RETURNING xp_amount INTO v_granted;
  IF v_granted IS NULL THEN
    RETURN jsonb_build_object('status', 'ALREADY_GRANTED', 'xp_amount', 0, 'idempotency_key', v_key);
  END IF;
  IF v_granted > 0 THEN
    UPDATE public.profiles p SET
      current_streak = CASE WHEN p.last_activity_date = v_today - 1 THEN p.current_streak + 1 ELSE 1 END,
      last_activity_date = v_today
      WHERE p.id = v_user AND (p.last_activity_date IS NULL OR p.last_activity_date < v_today);
  END IF;
  RETURN jsonb_build_object('status', 'GRANTED', 'xp_amount', v_granted, 'idempotency_key', v_key);
END;
$$;

-- unlock_achievement is defined below with a closed reward/condition registry.

CREATE FUNCTION public.send_friend_request(receiver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_receiver uuid := $1;
  v_id uuid;
  v_friendship public.friendships%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_receiver IS NULL OR v_receiver = v_user THEN
    RETURN jsonb_build_object('status', 'INVALID_RECEIVER');
  END IF;
  -- Lock both auth identities in UUID order against account removal.
  PERFORM u.id FROM auth.users u WHERE u.id IN (v_user, v_receiver) ORDER BY u.id FOR KEY SHARE;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_user) THEN
    RETURN jsonb_build_object('status', 'UNAUTHORIZED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_receiver) THEN
    RETURN jsonb_build_object('status', 'RECEIVER_NOT_FOUND');
  END IF;
  INSERT INTO public.friendships (requester_id, receiver_id, status)
    VALUES (v_user, v_receiver, 'pending')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT f.* INTO v_friendship FROM public.friendships f
      WHERE LEAST(f.requester_id, f.receiver_id) = LEAST(v_user, v_receiver)
        AND GREATEST(f.requester_id, f.receiver_id) = GREATEST(v_user, v_receiver)
      FOR UPDATE;
    -- A simultaneous cancellation may have removed the conflicting row.
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'RETRY'); END IF;
    RETURN jsonb_build_object('status', CASE
      WHEN v_friendship.status = 'accepted' THEN 'ALREADY_FRIENDS'
      WHEN v_friendship.status <> 'pending' THEN 'INVALID_STATE'
      WHEN v_friendship.requester_id = v_user THEN 'ALREADY_PENDING'
      ELSE 'INCOMING_REQUEST' END, 'friendship_id', v_friendship.id);
  END IF;
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, reference_type, reference_id)
    VALUES (v_receiver, v_user, 'friend_request', 'Você recebeu um pedido de amizade.', 'friendship', v_id::text);
  RETURN jsonb_build_object('status', 'SENT', 'friendship_id', v_id);
END;
$$;

CREATE FUNCTION public.accept_friend_request(friendship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid := $1;
  v_friendship public.friendships%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('status', 'INVALID_PARAMS'); END IF;
  SELECT f.* INTO v_friendship FROM public.friendships f
    WHERE f.id = v_id AND f.receiver_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'FRIENDSHIP_NOT_FOUND'); END IF;
  IF v_friendship.status = 'accepted' THEN
    RETURN jsonb_build_object('status', 'ALREADY_ACCEPTED', 'friendship_id', v_id);
  END IF;
  IF v_friendship.status <> 'pending' THEN RETURN jsonb_build_object('status', 'INVALID_STATE'); END IF;
  UPDATE public.friendships f SET status = 'accepted'
    WHERE f.id = v_id AND f.receiver_id = v_user AND f.status = 'pending';
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, reference_type, reference_id)
    VALUES (v_friendship.requester_id, v_user, 'friend_accepted', 'Seu pedido de amizade foi aceito.', 'friendship', v_id::text);
  RETURN jsonb_build_object('status', 'ACCEPTED', 'friendship_id', v_id);
END;
$$;

CREATE FUNCTION public.reject_friend_request(friendship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid := $1;
  v_friendship public.friendships%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('status', 'INVALID_PARAMS'); END IF;
  SELECT f.* INTO v_friendship FROM public.friendships f
    WHERE f.id = v_id AND f.receiver_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'FRIENDSHIP_NOT_FOUND'); END IF;
  IF v_friendship.status <> 'pending' THEN RETURN jsonb_build_object('status', 'INVALID_STATE'); END IF;
  -- Mapping permits UPDATE/DELETE. DELETE allows a future new request without
  -- silently reopening a rejected row or accepting it through the send endpoint.
  DELETE FROM public.friendships f WHERE f.id = v_id AND f.receiver_id = v_user AND f.status = 'pending';
  RETURN jsonb_build_object('status', 'REJECTED', 'friendship_id', v_id);
END;
$$;

CREATE FUNCTION public.cancel_friend_request(friendship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid := $1;
  v_friendship public.friendships%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('status', 'INVALID_PARAMS'); END IF;
  SELECT f.* INTO v_friendship FROM public.friendships f
    WHERE f.id = v_id AND f.requester_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'FRIENDSHIP_NOT_FOUND'); END IF;
  IF v_friendship.status <> 'pending' THEN RETURN jsonb_build_object('status', 'INVALID_STATE'); END IF;
  DELETE FROM public.friendships f WHERE f.id = v_id AND f.requester_id = v_user AND f.status = 'pending';
  RETURN jsonb_build_object('status', 'CANCELLED', 'friendship_id', v_id);
END;
$$;

CREATE FUNCTION public.remove_friend(friendship_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid := $1;
  v_friendship public.friendships%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('status', 'INVALID_PARAMS'); END IF;
  SELECT f.* INTO v_friendship FROM public.friendships f
    WHERE f.id = v_id AND (f.requester_id = v_user OR f.receiver_id = v_user) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'FRIENDSHIP_NOT_FOUND'); END IF;
  IF v_friendship.status <> 'accepted' THEN RETURN jsonb_build_object('status', 'INVALID_STATE'); END IF;
  DELETE FROM public.friendships f WHERE f.id = v_id AND f.status = 'accepted'
    AND (f.requester_id = v_user OR f.receiver_id = v_user);
  RETURN jsonb_build_object('status', 'REMOVED', 'friendship_id', v_id);
END;
$$;

CREATE FUNCTION public.unlock_achievement(achievement_id text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_key text := $1;
  v_profile public.profiles%ROWTYPE;
  v_library record;
  v_social record;
  v_condition boolean := false;
  v_reward integer;
  v_granted integer;
  v_achievement uuid;
  v_total_xp bigint;
  v_accumulated bigint := 0;
  v_needed bigint;
  v_level integer := 1;
  v_streak integer;
  v_today date := (statement_timestamp() AT TIME ZONE 'UTC')::date;
  -- Versioned authority, copied from xpConstants.ts. achievements.xp is display-only.
  v_rewards constant jsonb := '{
    "first_episode":50,"ep_10":80,"ep_50":150,"ep_100":250,"ep_500":500,"ep_1000":1000,
    "first_chapter":40,"ch_20":80,"ch_100":200,"ch_500":450,"ch_1000":900,
    "first_movie":60,"movie_10":120,"movie_25":250,"movie_50":500,
    "first_add":20,"list_5":40,"list_10":80,"list_25":150,"list_50":300,"list_100":500,
    "first_complete":100,"complete_5":200,"complete_10":300,"complete_25":500,"four_categories":120,"planned_10":80,
    "streak_3":100,"streak_7":250,"streak_30":600,"login_3":60,"login_7":150,"login_30":400,"streak_weeks_4":300,
    "first_friend":50,"friends_5":100,"friends_10":200,"friends_25":400,"first_post":30,
    "post_liked_5":80,"post_liked_10":150,"post_10":120,"first_comment":25,"comment_received":50,
    "first_community":40,"watch_together_first":60,"watch_together_done":100,"friend_request_sent":20,
    "post_community_10":150,"founded_community":100,"community_10m":250,"first_event":60,"create_event":80,"communities_5":150,
    "both_types":60,"multimedia":120,"five_genres":200,"movie_and_live":80,"same_work_types":150,"long_anime":300,"long_manga":300,
    "profile_complete":80,"has_avatar":40,"has_banner":40,"has_badge":30,"level_5":100,"level_10":200,"level_25":500,"level_50":1000,
    "founder":500,"same_day_complete":200,"complete_100":2000,"max_level":5000,"otaku_supreme":2000
  }'::jsonb;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'UNAUTHORIZED'); END IF;
  IF v_key IS NULL OR NOT (v_rewards ? v_key) THEN
    RETURN jsonb_build_object('status', 'INVALID_ACHIEVEMENT');
  END IF;
  SELECT p.* INTO v_profile FROM public.profiles p WHERE p.id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'PROFILE_REQUIRED'); END IF;
  -- The catalog must be populated by a separately authorized seed/import.
  PERFORM 1 FROM public.achievements a WHERE a.key = v_key FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'INVALID_ACHIEVEMENT'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_achievements a WHERE a.user_id = v_user AND a.achievement_key = v_key) THEN
    RETURN jsonb_build_object('status', 'ALREADY_GRANTED', 'xp_amount', 0, 'achievement_id', v_key);
  END IF;
  v_reward := (v_rewards ->> v_key)::integer;

  -- Categories and work identity use the catalog, never title matching or a
  -- fabricated movie/liveaction value (entry.type itself only permits anime/manga).
  WITH entries AS (
    SELECT e.*, coalesce(r.category, e.type) AS category,
      CASE WHEN e.release_id IS NULL THEN e.work_id ELSE r.work_id END AS canonical_work_id
    FROM public.anime_entries e LEFT JOIN public.work_releases r ON r.id = e.release_id
    WHERE e.user_id = v_user
  )
  SELECT
    coalesce(sum(e.current_episode) FILTER (WHERE e.category = 'anime'), 0) AS episodes,
    coalesce(sum(e.current_chapter) FILTER (WHERE e.category = 'manga'), 0) AS chapters,
    count(*) FILTER (WHERE e.category IN ('movie', 'liveaction') AND e.status = 'completed') AS movies,
    count(*) AS titles,
    count(*) FILTER (WHERE e.status = 'completed') AS completed,
    count(*) FILTER (WHERE e.status = 'planned') AS planned,
    count(DISTINCT e.category) AS categories,
    count(*) FILTER (WHERE e.category = 'anime') > 0 AS has_anime,
    count(*) FILTER (WHERE e.category = 'manga') > 0 AS has_manga,
    count(*) FILTER (WHERE e.category = 'movie') > 0 AS has_movie,
    count(*) FILTER (WHERE e.category = 'liveaction') > 0 AS has_liveaction,
    count(*) FILTER (WHERE e.category = 'anime' AND e.status = 'completed' AND e.current_episode >= 100) > 0 AS long_anime,
    count(*) FILTER (WHERE e.category = 'manga' AND e.status = 'completed' AND e.current_chapter >= 100) > 0 AS long_manga,
    count(DISTINCT date_trunc('week', e.created_at AT TIME ZONE 'UTC')) AS active_weeks,
    EXISTS (SELECT 1 FROM entries a JOIN entries m ON m.canonical_work_id = a.canonical_work_id
      WHERE a.category = 'anime' AND m.category = 'manga') AS same_work
  INTO v_library FROM entries e;

  -- Count normalized facts; never trust client claims or denormalized counters.
  SELECT
    (SELECT count(*) FROM public.posts p WHERE p.author_id = v_user) AS posts,
    (SELECT coalesce(max(l.n), 0) FROM (
      SELECT count(*) AS n FROM public.post_likes pl JOIN public.posts p ON p.id = pl.post_id
      WHERE p.author_id = v_user GROUP BY p.id) l) AS max_likes,
    (SELECT count(*) FROM public.posts p WHERE p.author_id = v_user AND p.community_id IS NOT NULL) AS community_posts,
    (SELECT count(*) FROM public.comments c WHERE c.author_id = v_user) AS comments,
    (SELECT count(*) FROM public.comments c JOIN public.posts p ON p.id = c.post_id
      WHERE p.author_id = v_user AND c.author_id <> v_user) AS comments_received,
    (SELECT count(*) FROM public.friendships f WHERE f.status = 'accepted'
      AND (f.requester_id = v_user OR f.receiver_id = v_user)) AS friends,
    (SELECT count(*) FROM public.friendships f WHERE f.requester_id = v_user) AS requests_sent,
    (SELECT count(*) FROM public.community_members m JOIN public.communities c ON c.id = m.community_id
      WHERE m.user_id = v_user AND c.creator_id IS DISTINCT FROM v_user) AS communities_joined,
    (SELECT count(*) FROM public.communities c WHERE c.creator_id = v_user) AS communities_created,
    (SELECT coalesce(max(m.n), 0) FROM (
      SELECT count(*) AS n FROM public.community_members cm JOIN public.communities c ON c.id = cm.community_id
      WHERE c.creator_id = v_user GROUP BY c.id) m) AS community_max_members,
    (SELECT count(*) FROM public.events e WHERE e.organizer_id = v_user OR EXISTS (
      SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.user_id = v_user)) AS events_joined,
    (SELECT count(*) FROM public.events e WHERE e.organizer_id = v_user) AS events_created,
    (SELECT count(*) FROM public.watch_together w WHERE w.initiator_id = v_user OR w.friend_id = v_user) AS watches,
    (SELECT count(*) FROM public.watch_together w WHERE w.status = 'completed'
      AND (w.initiator_id = v_user OR w.friend_id = v_user)) AS watches_completed
  INTO v_social;

  SELECT coalesce(sum(x.xp_amount), 0) INTO v_total_xp FROM public.xp_events x WHERE x.user_id = v_user;
  WHILE v_level < 100 LOOP
    v_needed := floor(100 * power(v_level::numeric, 1.6));
    EXIT WHEN v_accumulated + v_needed > v_total_xp;
    v_accumulated := v_accumulated + v_needed; v_level := v_level + 1;
  END LOOP;
  v_streak := CASE WHEN v_profile.last_activity_date >= v_today - 1
    THEN v_profile.current_streak ELSE 0 END;

  v_condition := CASE v_key
    WHEN 'first_episode' THEN v_library.episodes >= 1
    WHEN 'ep_10' THEN v_library.episodes >= 10
    WHEN 'ep_50' THEN v_library.episodes >= 50
    WHEN 'ep_100' THEN v_library.episodes >= 100
    WHEN 'ep_500' THEN v_library.episodes >= 500
    WHEN 'ep_1000' THEN v_library.episodes >= 1000
    WHEN 'first_chapter' THEN v_library.chapters >= 1
    WHEN 'ch_20' THEN v_library.chapters >= 20
    WHEN 'ch_100' THEN v_library.chapters >= 100
    WHEN 'ch_500' THEN v_library.chapters >= 500
    WHEN 'ch_1000' THEN v_library.chapters >= 1000
    WHEN 'first_movie' THEN v_library.movies >= 1
    WHEN 'movie_10' THEN v_library.movies >= 10
    WHEN 'movie_25' THEN v_library.movies >= 25
    WHEN 'movie_50' THEN v_library.movies >= 50
    WHEN 'first_add' THEN v_library.titles >= 1
    WHEN 'list_5' THEN v_library.titles >= 5
    WHEN 'list_10' THEN v_library.titles >= 10
    WHEN 'list_25' THEN v_library.titles >= 25
    WHEN 'list_50' THEN v_library.titles >= 50
    WHEN 'list_100' THEN v_library.titles >= 100
    WHEN 'first_complete' THEN v_library.completed >= 1
    WHEN 'complete_5' THEN v_library.completed >= 5
    WHEN 'complete_10' THEN v_library.completed >= 10
    WHEN 'complete_25' THEN v_library.completed >= 25
    -- Canonical key is historical; its documented condition is THREE categories.
    WHEN 'four_categories' THEN v_library.categories >= 3
    WHEN 'planned_10' THEN v_library.planned >= 10
    WHEN 'streak_3' THEN v_streak >= 3
    WHEN 'streak_7' THEN v_streak >= 7
    WHEN 'streak_30' THEN v_streak >= 30
    WHEN 'login_3' THEN v_profile.login_streak >= 3
    WHEN 'login_7' THEN v_profile.login_streak >= 7
    WHEN 'login_30' THEN v_profile.login_streak >= 30
    -- Four different UTC weeks with library additions, not an invented streak.
    WHEN 'streak_weeks_4' THEN v_library.active_weeks >= 4
    WHEN 'first_friend' THEN v_social.friends >= 1
    WHEN 'friends_5' THEN v_social.friends >= 5
    WHEN 'friends_10' THEN v_social.friends >= 10
    WHEN 'friends_25' THEN v_social.friends >= 25
    WHEN 'first_post' THEN v_social.posts >= 1
    WHEN 'post_liked_5' THEN v_social.max_likes >= 5
    WHEN 'post_liked_10' THEN v_social.max_likes >= 10
    WHEN 'post_10' THEN v_social.posts >= 10
    WHEN 'first_comment' THEN v_social.comments >= 1
    WHEN 'comment_received' THEN v_social.comments_received >= 1
    WHEN 'first_community' THEN v_social.communities_joined >= 1
    WHEN 'watch_together_first' THEN v_social.watches >= 1
    WHEN 'watch_together_done' THEN v_social.watches_completed >= 1
    WHEN 'friend_request_sent' THEN v_social.requests_sent >= 1
    WHEN 'post_community_10' THEN v_social.community_posts >= 10
    WHEN 'founded_community' THEN v_social.communities_created >= 1
    WHEN 'community_10m' THEN v_social.community_max_members >= 10
    WHEN 'first_event' THEN v_social.events_joined >= 1
    WHEN 'create_event' THEN v_social.events_created >= 1
    WHEN 'communities_5' THEN v_social.communities_joined >= 5
    WHEN 'both_types' THEN v_library.has_anime AND v_library.has_manga
    WHEN 'multimedia' THEN v_library.has_anime AND v_library.has_manga AND v_library.has_movie
    WHEN 'five_genres' THEN (
      SELECT count(DISTINCT lower(btrim(g.genre))) >= 5
      FROM public.anime_entries e
      LEFT JOIN public.work_releases r ON r.id = e.release_id
      JOIN public.works w ON w.id = CASE WHEN e.release_id IS NULL THEN e.work_id ELSE r.work_id END
      CROSS JOIN LATERAL unnest(w.genres) AS g(genre)
      WHERE e.user_id = v_user AND length(btrim(g.genre)) > 0)
    WHEN 'movie_and_live' THEN v_library.has_movie AND v_library.has_liveaction
    WHEN 'same_work_types' THEN v_library.same_work
    WHEN 'long_anime' THEN v_library.long_anime
    WHEN 'long_manga' THEN v_library.long_manga
    WHEN 'profile_complete' THEN length(btrim(v_profile.username)) > 0
      AND length(btrim(v_profile.avatar_url)) > 0 AND length(btrim(v_profile.bio)) > 0
    WHEN 'has_avatar' THEN length(btrim(v_profile.avatar_url)) > 0
    WHEN 'has_banner' THEN length(btrim(v_profile.banner_url)) > 0
    WHEN 'has_badge' THEN EXISTS (SELECT 1 FROM public.user_achievements a
      WHERE a.user_id = v_user AND a.achievement_key = v_profile.selected_badge_id)
    WHEN 'level_5' THEN v_level >= 5
    WHEN 'level_10' THEN v_level >= 10
    WHEN 'level_25' THEN v_level >= 25
    WHEN 'level_50' THEN v_level >= 50
    WHEN 'founder' THEN EXISTS (SELECT 1 FROM (
      SELECT u.id FROM auth.users u ORDER BY u.created_at, u.id LIMIT 10
    ) first_users WHERE first_users.id = v_user)
    WHEN 'same_day_complete' THEN EXISTS (
      SELECT 1 FROM public.anime_entries e JOIN public.xp_events x ON x.source_id = e.id::text
      WHERE e.user_id = v_user AND x.user_id = v_user AND x.source_type = 'anime_entry'
        AND x.event_type = 'work_completed' AND x.created_at >= e.created_at
        AND (x.created_at AT TIME ZONE 'UTC')::date = (e.created_at AT TIME ZONE 'UTC')::date)
    WHEN 'complete_100' THEN v_library.completed >= 100
    WHEN 'max_level' THEN v_level >= 100
    WHEN 'otaku_supreme' THEN v_library.episodes >= 100 AND v_library.chapters >= 100
      AND v_library.completed >= 10 AND v_social.posts >= 10
    ELSE false END;
  IF v_condition IS NOT TRUE THEN
    RETURN jsonb_build_object('status', 'CONDITION_NOT_MET', 'xp_amount', 0, 'achievement_id', v_key);
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_key)
    VALUES (v_user, v_key)
    ON CONFLICT ON CONSTRAINT uq_user_achievements_user_id_achievement_key DO NOTHING
    RETURNING id INTO v_achievement;
  IF v_achievement IS NULL THEN
    RETURN jsonb_build_object('status', 'ALREADY_GRANTED', 'xp_amount', 0, 'achievement_id', v_key);
  END IF;
  INSERT INTO public.xp_events (user_id, event_type, achievement_id, xp_amount, source_type, source_id, idempotency_key)
    VALUES (v_user, 'achievement_unlocked', v_key, v_reward, 'achievement', v_key, 'achievement:' || v_key)
    ON CONFLICT ON CONSTRAINT uq_xp_events_user_id_idempotency_key DO NOTHING
    RETURNING xp_amount INTO v_granted;
  v_granted := coalesce(v_granted, 0);
  IF v_granted > 0 THEN
    UPDATE public.profiles p SET
      current_streak = CASE WHEN p.last_activity_date = v_today - 1 THEN p.current_streak + 1 ELSE 1 END,
      last_activity_date = v_today
      WHERE p.id = v_user AND (p.last_activity_date IS NULL OR p.last_activity_date < v_today);
  END IF;
  RETURN jsonb_build_object('status', 'GRANTED', 'xp_amount', v_granted, 'achievement_id', v_key);
END;
$$;

-- Remove default PUBLIC/Supabase function grants in the same transaction.
-- service_role is deliberately not an alternate caller identity: these APIs
-- require a signed-in user's auth.uid(); offline import is a separate authority.
REVOKE ALL ON FUNCTION public.update_progress(uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.unlock_achievement(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.grant_xp(text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.accept_friend_request(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reject_friend_request(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cancel_friend_request(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.remove_friend(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_progress(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_xp(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;

COMMIT;
