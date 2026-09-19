-- Safely update editable profile fields after onboarding.

create or replace function public.update_profile(
  p_updates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_profile public.profiles%rowtype;
  v_username text;
  v_display_name text;
  v_language text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_updates is null
     or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'INVALID_PAYLOAD';
  end if;

  -- Reject fields that the client is not allowed to change through this RPC.
  if exists (
    select 1
    from jsonb_object_keys(p_updates) as k(key)
    where key not in (
      'username',
      'display_name',
      'bio',
      'country',
      'preferred_language',
      'avatar_url',
      'avatar_crop',
      'banner_url',
      'banner_crop',
      'links',
      'list_visibility',
      'profile_visibility',
      'push_enabled',
      'achievement_sound_enabled',
      'selected_badge_id'
    )
  ) then
    raise exception 'UNSUPPORTED_FIELD';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if not v_profile.profile_setup_completed then
    raise exception 'PROFILE_SETUP_INCOMPLETE';
  end if;

  -- Username
  if p_updates ? 'username' then
    if p_updates -> 'username' = 'null'::jsonb then
      raise exception 'USERNAME_REQUIRED';
    end if;

    v_username := trim(p_updates ->> 'username');

    if char_length(v_username) < 3
       or char_length(v_username) > 24 then
      raise exception 'INVALID_USERNAME_LENGTH';
    end if;

    if v_username !~ '^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$'
       or v_username ~ '__' then
      raise exception 'INVALID_USERNAME_FORMAT';
    end if;

    if lower(v_username) like '%admin%' then
      raise exception 'RESERVED_USERNAME';
    end if;
  end if;

  -- Display name
  if p_updates ? 'display_name' then
    if p_updates -> 'display_name' = 'null'::jsonb then
      raise exception 'DISPLAY_NAME_REQUIRED';
    end if;

    v_display_name := trim(p_updates ->> 'display_name');

    if v_display_name = '' then
      raise exception 'DISPLAY_NAME_REQUIRED';
    end if;
  end if;

  -- Preferred language
  if p_updates ? 'preferred_language' then
    if p_updates -> 'preferred_language' = 'null'::jsonb then
      raise exception 'INVALID_LANGUAGE';
    end if;

    v_language := lower(trim(p_updates ->> 'preferred_language'));

    if v_language not in ('pt', 'en') then
      raise exception 'INVALID_LANGUAGE';
    end if;
  end if;

  -- Visibility
  if p_updates ? 'list_visibility'
     and coalesce(p_updates ->> 'list_visibility', '') not in (
       'public',
       'friends',
       'private'
     ) then
    raise exception 'INVALID_LIST_VISIBILITY';
  end if;

  if p_updates ? 'profile_visibility'
     and coalesce(p_updates ->> 'profile_visibility', '') not in (
       'public',
       'friends',
       'private'
     ) then
    raise exception 'INVALID_PROFILE_VISIBILITY';
  end if;

  update public.profiles
  set
    username =
      case
        when p_updates ? 'username'
          then v_username
        else username
      end,

    display_name =
      case
        when p_updates ? 'display_name'
          then v_display_name
        else display_name
      end,

    preferred_language =
      case
        when p_updates ? 'preferred_language'
          then v_language
        else preferred_language
      end,

    bio =
      case
        when p_updates ? 'bio'
          then nullif(trim(p_updates ->> 'bio'), '')
        else bio
      end,

    country =
      case
        when p_updates ? 'country'
          then nullif(trim(p_updates ->> 'country'), '')
        else country
      end,

    avatar_url =
      case
        when p_updates ? 'avatar_url'
          then nullif(trim(p_updates ->> 'avatar_url'), '')
        else avatar_url
      end,

    avatar_crop =
      case
        when p_updates ? 'avatar_crop'
          then p_updates -> 'avatar_crop'
        else avatar_crop
      end,

    banner_url =
      case
        when p_updates ? 'banner_url'
          then nullif(trim(p_updates ->> 'banner_url'), '')
        else banner_url
      end,

    banner_crop =
      case
        when p_updates ? 'banner_crop'
          then p_updates -> 'banner_crop'
        else banner_crop
      end,

    links =
      case
        when p_updates ? 'links'
          then coalesce(p_updates -> 'links', '{}'::jsonb)
        else links
      end,

    list_visibility =
      case
        when p_updates ? 'list_visibility'
          then p_updates ->> 'list_visibility'
        else list_visibility
      end,

    profile_visibility =
      case
        when p_updates ? 'profile_visibility'
          then p_updates ->> 'profile_visibility'
        else profile_visibility
      end,

    push_enabled =
      case
        when p_updates ? 'push_enabled'
          then (p_updates ->> 'push_enabled')::boolean
        else push_enabled
      end,

    achievement_sound_enabled =
      case
        when p_updates ? 'achievement_sound_enabled'
          then (p_updates ->> 'achievement_sound_enabled')::boolean
        else achievement_sound_enabled
      end,

    selected_badge_id =
      case
        when p_updates ? 'selected_badge_id'
          then nullif(p_updates ->> 'selected_badge_id', '')
        else selected_badge_id
      end
  where id = v_user_id;

  return jsonb_build_object(
    'status', 'UPDATED',
    'profile_id', v_user_id
  );

exception
  when unique_violation then
    raise exception 'USERNAME_TAKEN';
end;
$$;

revoke all
on function public.update_profile(jsonb)
from public, anon;

grant execute
on function public.update_profile(jsonb)
to authenticated;