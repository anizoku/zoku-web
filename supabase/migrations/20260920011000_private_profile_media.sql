-- Media follows profile visibility. Only the currently selected asset is shared;
-- the owner can still manage their entire folder, including unpublished uploads.
begin;
update storage.buckets set public = false where id in ('avatars', 'profile-banners');

drop policy if exists avatars_user_select on storage.objects;
drop policy if exists profile_banners_user_select on storage.objects;
create policy profile_media_select on storage.objects for select to anon, authenticated
using (
  bucket_id in ('avatars', 'profile-banners') and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      -- profiles RLS applies as caller: owner/admin/public/accepted friend.
      where (bucket_id = 'avatars' and p.avatar_url = name)
         or (bucket_id = 'profile-banners' and p.banner_url = name)
    )
  )
);

-- Crop imageUrl is a canonical object path, never an external/signed/blob URL.
-- Keep existing geometry while binding old crops to their selected media.
update public.profiles set avatar_crop = case when avatar_url is null then null
  else jsonb_set(avatar_crop, '{imageUrl}', to_jsonb(avatar_url)) end
where avatar_crop is not null;
update public.profiles set banner_crop = case when banner_url is null then null
  else jsonb_set(banner_crop, '{imageUrl}', to_jsonb(banner_url)) end
where banner_crop is not null;
alter table public.profiles add constraint profiles_avatar_crop_path_check check (
  avatar_crop is null or (avatar_url is not null and avatar_crop ->> 'imageUrl' = avatar_url));
alter table public.profiles add constraint profiles_banner_crop_path_check check (
  banner_crop is null or (banner_url is not null and banner_crop ->> 'imageUrl' = banner_url));

create or replace function public.set_avatar(p_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_path text := btrim(p_path);
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  -- Match the same lock ordering as update/remove and hold the object until commit.
  perform 1 from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_path is null or v_path = '' or v_path not like (auth.uid()::text || '/%') then
    raise exception 'INVALID_AVATAR_PATH';
  end if;
  perform 1 from storage.objects where bucket_id = 'avatars' and name = v_path for share;
  if not found then raise exception 'AVATAR_NOT_FOUND'; end if;
  update public.profiles set avatar_url = v_path,
    avatar_crop = case when avatar_url = v_path then avatar_crop else null end
  where id = auth.uid();
  return jsonb_build_object('status', 'UPDATED', 'avatar_url', v_path);
end;
$$;

create or replace function public.set_banner(p_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_path text := btrim(p_path);
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_path is null or v_path = '' or v_path not like (auth.uid()::text || '/%') then
    raise exception 'INVALID_BANNER_PATH';
  end if;
  perform 1 from storage.objects where bucket_id = 'profile-banners' and name = v_path for share;
  if not found then raise exception 'BANNER_NOT_FOUND'; end if;
  update public.profiles set banner_url = v_path,
    banner_crop = case when banner_url = v_path then banner_crop else null end
  where id = auth.uid();
  return jsonb_build_object('status', 'UPDATED', 'banner_url', v_path);
end;
$$;

revoke all on function public.set_avatar(text), public.set_banner(text),
  public.remove_avatar(), public.remove_banner() from public, anon, authenticated;
grant execute on function public.set_avatar(text), public.set_banner(text),
  public.remove_avatar(), public.remove_banner() to authenticated;
commit;
