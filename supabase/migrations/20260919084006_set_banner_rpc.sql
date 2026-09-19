-- Safely associate an uploaded profile banner
-- with the authenticated user's profile.
-- The file must already exist inside the user's
-- own profile-banners Storage folder.

create or replace function public.set_banner(
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
    raise exception 'INVALID_BANNER_PATH';
  end if;

  if v_path not like (v_user_id::text || '/%') then
    raise exception 'INVALID_BANNER_PATH';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'profile-banners'
      and name = v_path
  ) then
    raise exception 'BANNER_NOT_FOUND';
  end if;

  update public.profiles
  set banner_url = v_path
  where id = v_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'status', 'UPDATED',
    'banner_url', v_path
  );
end;
$$;

revoke all
on function public.set_banner(text)
from public, anon;

grant execute
on function public.set_banner(text)
to authenticated;