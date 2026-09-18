-- Ensure a user can only reference an avatar stored in their own folder.

alter table public.profiles
add constraint profiles_avatar_path_check
check (
  avatar_url is null
  or avatar_url like (id::text || '/%')
);