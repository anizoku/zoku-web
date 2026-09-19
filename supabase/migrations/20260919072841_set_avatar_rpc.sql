-- Safely associate an uploaded avatar with the authenticated user's profile.
-- The file must already exist inside the user's own avatars Storage folder.

create or replace function public.set_avatar(
  p_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_path text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_path := trim(p_path);

  if v_path is null or v_path = '' then
    raise exception 'INVALID_AVATAR_PATH';
  end if;

  -- Avatar must belong to the authenticated user's folder.
  if v_path not like (v_user_id::text || '/%') then
    raise exception 'INVALID_AVATAR_PATH';
  end if;

  -- File must actually exist in the avatars bucket.
  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'avatars'
      and name = v_path
  ) then
    raise exception 'AVATAR_NOT_FOUND';
  end if;

  update public.profiles
  set avatar_url = v_path
  where id = v_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'status', 'UPDATED',
    'avatar_url', v_path
  );
end;
$$;

revoke all
on function public.set_avatar(text)
from public, anon;

grant execute
on function public.set_avatar(text)
to authenticated;