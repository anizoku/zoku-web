-- Clear the authenticated user's current profile banner reference safely.
-- Physical file deletion must be performed through the Supabase Storage API.

create or replace function public.remove_banner()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_banner_path text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select banner_url
  into v_banner_path
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_banner_path is null or trim(v_banner_path) = '' then
    return jsonb_build_object(
      'status', 'NO_BANNER'
    );
  end if;

  if v_banner_path not like (v_user_id::text || '/%') then
    raise exception 'INVALID_BANNER_PATH';
  end if;

  update public.profiles
  set
    banner_url = null,
    banner_crop = null
  where id = v_user_id;

  return jsonb_build_object(
    'status', 'REMOVED',
    'banner_path', v_banner_path
  );
end;
$$;

revoke all
on function public.remove_banner()
from public, anon;

grant execute
on function public.remove_banner()
to authenticated;