-- Public avatar files remain directly accessible because the bucket is public.
-- Remove broad SELECT access on storage.objects so clients cannot list
-- every object in the avatars bucket through the Storage API.

drop policy if exists "avatars_public_read"
on storage.objects;