-- Ensure a user can only reference a profile banner stored in their own folder.

alter table public.profiles
add constraint profiles_banner_path_check
check (
  banner_url is null
  or banner_url like (id::text || '/%')
);