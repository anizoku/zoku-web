-- Clear the authenticated user's current avatar reference safely.
-- Physical file deletion must be performed through the Supabase Storage API.

create or replace function public.remove_avatar()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_avatar_path text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select avatar_url
  into v_avatar_path
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_avatar_path is null or trim(v_avatar_path) = '' then
    return jsonb_build_object(
      'status', 'NO_AVATAR'
    );
  end if;

  if v_avatar_path not like (v_user_id::text || '/%') then
    raise exception 'INVALID_AVATAR_PATH';
  end if;

  update public.profiles
  set
    avatar_url = null,
    avatar_crop = null
  where id = v_user_id;

  return jsonb_build_object(
    'status', 'REMOVED',
    'avatar_path', v_avatar_path
  );
end;
$$;

revoke all
on function public.remove_avatar()
from public, anon;

grant execute
on function public.remove_avatar()
to authenticated;