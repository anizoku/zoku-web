-- Complete profile onboarding atomically.
-- Users may edit normal profile fields directly, but onboarding completion
-- must go through this RPC.

create or replace function public.complete_profile_setup(
  p_username text,
  p_display_name text,
  p_preferred_language text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_username text;
  v_display_name text;
  v_language text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_username := trim(p_username);
  v_display_name := trim(p_display_name);
  v_language := lower(trim(p_preferred_language));

  if char_length(v_username) < 3 or char_length(v_username) > 24 then
    raise exception 'INVALID_USERNAME_LENGTH';
  end if;

  if v_username !~ '^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$'
     or v_username ~ '__' then
    raise exception 'INVALID_USERNAME_FORMAT';
  end if;

  if lower(v_username) like '%admin%' then
    raise exception 'RESERVED_USERNAME';
  end if;

  if v_display_name = '' then
    raise exception 'DISPLAY_NAME_REQUIRED';
  end if;

  if v_language not in ('pt', 'en') then
    raise exception 'INVALID_LANGUAGE';
  end if;

  update public.profiles
  set
    username = v_username,
    display_name = v_display_name,
    preferred_language = v_language,
    profile_setup_completed = true,
    profile_setup_completed_at = coalesce(
      profile_setup_completed_at,
      now()
    )
  where id = v_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'status', 'COMPLETED',
    'username', v_username,
    'display_name', v_display_name,
    'preferred_language', v_language
  );

exception
  when unique_violation then
    raise exception 'USERNAME_TAKEN';
end;
$$;

revoke all
on function public.complete_profile_setup(text, text, text)
from public, anon;

grant execute
on function public.complete_profile_setup(text, text, text)
to authenticated;

-- Completion state may no longer be changed directly by the client.
revoke update (
  profile_setup_completed,
  profile_setup_completed_at
)
on public.profiles
from authenticated;