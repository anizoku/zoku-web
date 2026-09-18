-- Protect sensitive profile columns from direct client writes.
-- Profile creation is handled by the auth.users trigger.
-- Internal counters and roles are controlled by trusted backend logic/RPCs.

revoke insert, update, delete
on table public.profiles
from authenticated;

grant update (
  username,
  display_name,
  bio,
  avatar_url,
  avatar_crop,
  banner_url,
  banner_crop,
  country,
  preferred_language,
  links,
  favorite_animes,
  favorite_mangas,
  selected_badge_id,
  list_visibility,
  profile_visibility,
  profile_setup_completed,
  profile_setup_completed_at,
  push_enabled,
  achievement_sound_enabled
)
on table public.profiles
to authenticated;