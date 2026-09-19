-- Create public profile banner bucket.
-- Users may only manage banner files inside their own folder.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-banners',
  'profile-banners',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "profile_banners_user_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_banners_user_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_banners_user_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_banners_user_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);