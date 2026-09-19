-- Allow authenticated users to read only avatar objects
-- stored inside their own folder.
-- This supports Storage API operations such as delete
-- without allowing clients to list the entire bucket.

create policy "avatars_user_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);