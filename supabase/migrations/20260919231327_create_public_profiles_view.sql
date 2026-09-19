create or replace view public.public_profiles
with (security_invoker = true)
as
select
  id,
  username,
  display_name,
  bio,
  avatar_url,
  avatar_crop,
  banner_url,
  banner_crop,
  country,
  links,
  favorite_animes,
  selected_badge_id,
  profile_visibility,
  list_visibility,
  created_at
from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;

grant select on public.public_profiles to anon, authenticated;