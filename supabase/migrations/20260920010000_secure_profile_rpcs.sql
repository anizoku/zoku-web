-- Profile mutations are RPC-only. Public reads retain the existing row policy.
begin;

revoke all on public.profiles from public, anon, authenticated;
-- Table REVOKE does not remove grants previously made on individual columns.
do $$
declare v_columns text;
begin
  select string_agg(quote_ident(attname), ', ') into v_columns
  from pg_attribute
  where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke all (%s) on public.profiles from public, anon, authenticated', v_columns);
end;
$$;

drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

-- These are exactly the columns exposed by the security-invoker view.
grant select (id, username, display_name, bio, avatar_url, avatar_crop,
  banner_url, banner_crop, country, links, favorite_animes, selected_badge_id,
  profile_visibility, list_visibility, created_at)
on public.profiles to anon, authenticated;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Fixed identity: no caller-supplied user ID and no arbitrary profile lookup.
create function public.get_my_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select to_jsonb(p) - 'legacy_base44_id' into v_profile
  from public.profiles p where p.id = auth.uid();
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  return v_profile;
end;
$$;
revoke all on function public.get_my_profile() from public, anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_username text;
begin
  -- Signup metadata is untrusted and must never prevent creation of a profile.
  v_name := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
                         nullif(btrim(new.raw_user_meta_data ->> 'name'), '')), 50);
  v_username := 'u_' || left(replace(new.id::text, '-', ''), 22);
  loop
    insert into public.profiles(id, username, display_name)
    values (new.id, v_username, v_name) on conflict do nothing;
    exit when found or exists (select 1 from public.profiles where id = new.id);
    -- A chosen username can collide with a generated placeholder. Retry safely.
    v_username := 'u_' || left(replace(gen_random_uuid()::text, '-', ''), 22);
  end loop;
  return new;
end;
$$;

create or replace function public.complete_profile_setup(
  p_username text, p_display_name text, p_preferred_language text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype; v_username text; v_name text; v_language text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  -- Retries never become a second editing endpoint or change completion time.
  if v_profile.profile_setup_completed then
    return jsonb_build_object('status', 'ALREADY_COMPLETED', 'username', v_profile.username,
      'display_name', v_profile.display_name, 'preferred_language', v_profile.preferred_language);
  end if;
  v_username := btrim(p_username);
  v_name := btrim(p_display_name);
  v_language := lower(btrim(p_preferred_language));
  if v_username is null then raise exception 'USERNAME_REQUIRED'; end if;
  if char_length(v_username) not between 3 and 24 then raise exception 'INVALID_USERNAME_LENGTH'; end if;
  if v_username !~ '^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$' or v_username ~ '__' then
    raise exception 'INVALID_USERNAME_FORMAT';
  end if;
  if lower(v_username) like '%admin%' then raise exception 'RESERVED_USERNAME'; end if;
  if v_name is null or v_name = '' then raise exception 'DISPLAY_NAME_REQUIRED'; end if;
  if char_length(v_name) > 50 then raise exception 'INVALID_DISPLAY_NAME_LENGTH'; end if;
  if v_language is null or v_language not in ('pt', 'en') then raise exception 'INVALID_LANGUAGE'; end if;
  update public.profiles set username = v_username, display_name = v_name,
    preferred_language = v_language, profile_setup_completed = true,
    profile_setup_completed_at = now() where id = auth.uid();
  return jsonb_build_object('status', 'COMPLETED', 'username', v_username,
    'display_name', v_name, 'preferred_language', v_language);
exception when unique_violation then raise exception 'USERNAME_TAKEN';
end;
$$;

create or replace function public.update_profile(p_updates jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype; v_key text; v_value jsonb; v_text text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if not v_profile.profile_setup_completed then raise exception 'PROFILE_SETUP_INCOMPLETE'; end if;

  for v_key, v_value in select key, value from jsonb_each(p_updates) loop
    if v_key not in ('username', 'display_name', 'bio', 'country', 'preferred_language',
      'avatar_crop', 'banner_crop', 'links', 'favorite_animes', 'selected_badge_id',
      'list_visibility', 'profile_visibility', 'push_enabled', 'achievement_sound_enabled') then
      raise exception 'UNSUPPORTED_FIELD';
    end if;
    if v_key in ('username', 'display_name', 'preferred_language', 'list_visibility', 'profile_visibility')
       and jsonb_typeof(v_value) <> 'string' then raise exception 'INVALID_FIELD_TYPE: %', v_key; end if;
    if v_key in ('bio', 'country', 'selected_badge_id')
       and jsonb_typeof(v_value) not in ('string', 'null') then raise exception 'INVALID_FIELD_TYPE: %', v_key; end if;
    if v_key in ('push_enabled', 'achievement_sound_enabled')
       and jsonb_typeof(v_value) <> 'boolean' then raise exception 'INVALID_FIELD_TYPE: %', v_key; end if;

    v_text := btrim(v_value #>> '{}');
    case v_key
      when 'username' then
        if char_length(v_text) not between 3 and 24 then raise exception 'INVALID_USERNAME_LENGTH'; end if;
        if v_text !~ '^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$' or v_text ~ '__' then
          raise exception 'INVALID_USERNAME_FORMAT';
        end if;
        if lower(v_text) like '%admin%' then raise exception 'RESERVED_USERNAME'; end if;
        v_profile.username := v_text;
      when 'display_name' then
        if char_length(v_text) not between 1 and 50 then raise exception 'INVALID_DISPLAY_NAME_LENGTH'; end if;
        v_profile.display_name := v_text;
      when 'bio' then
        if char_length(v_text) > 300 then raise exception 'INVALID_BIO_LENGTH'; end if;
        v_profile.bio := nullif(v_text, '');
      when 'country' then
        v_profile.country := upper(nullif(v_text, ''));
        if v_profile.country !~ '^[A-Z]{2}$' then raise exception 'INVALID_COUNTRY'; end if;
      when 'preferred_language' then
        if lower(v_text) not in ('pt', 'en') then raise exception 'INVALID_LANGUAGE'; end if;
        v_profile.preferred_language := lower(v_text);
      when 'list_visibility' then
        if v_text not in ('public', 'friends', 'private') then raise exception 'INVALID_LIST_VISIBILITY'; end if;
        v_profile.list_visibility := v_text;
      when 'profile_visibility' then
        if v_text not in ('public', 'friends', 'private') then raise exception 'INVALID_PROFILE_VISIBILITY'; end if;
        v_profile.profile_visibility := v_text;
      when 'push_enabled' then v_profile.push_enabled := (v_value #>> '{}')::boolean;
      when 'achievement_sound_enabled' then v_profile.achievement_sound_enabled := (v_value #>> '{}')::boolean;
      when 'selected_badge_id' then v_profile.selected_badge_id := nullif(v_text, '');
      when 'links' then
        if not public.is_valid_profile_links(v_value) then raise exception 'INVALID_LINKS'; end if;
        v_profile.links := v_value;
      when 'avatar_crop' then
        v_profile.avatar_crop := nullif(v_value, 'null'::jsonb);
        if not public.is_valid_profile_crop(v_profile.avatar_crop) then raise exception 'INVALID_AVATAR_CROP'; end if;
        if v_profile.avatar_crop is not null and
           (v_profile.avatar_crop ->> 'imageUrl') is distinct from v_profile.avatar_url then
          raise exception 'AVATAR_CROP_PATH_MISMATCH';
        end if;
      when 'banner_crop' then
        v_profile.banner_crop := nullif(v_value, 'null'::jsonb);
        if not public.is_valid_profile_crop(v_profile.banner_crop) then raise exception 'INVALID_BANNER_CROP'; end if;
        if v_profile.banner_crop is not null and
           (v_profile.banner_crop ->> 'imageUrl') is distinct from v_profile.banner_url then
          raise exception 'BANNER_CROP_PATH_MISMATCH';
        end if;
      when 'favorite_animes' then
        if jsonb_typeof(v_value) <> 'array' then raise exception 'INVALID_FAVORITE_ANIMES'; end if;
        if exists (select 1 from jsonb_array_elements(v_value) e
                   where jsonb_typeof(e) <> 'string' or btrim(e #>> '{}') = '') then
          raise exception 'INVALID_FAVORITE_ANIMES';
        end if;
        select coalesce(array_agg(btrim(value) order by ordinality), '{}'::text[])
          into v_profile.favorite_animes from jsonb_array_elements_text(v_value) with ordinality;
    end case;
  end loop;

  update public.profiles set username = v_profile.username, display_name = v_profile.display_name,
    bio = v_profile.bio, country = v_profile.country, preferred_language = v_profile.preferred_language,
    avatar_crop = v_profile.avatar_crop, banner_crop = v_profile.banner_crop, links = v_profile.links,
    favorite_animes = v_profile.favorite_animes, selected_badge_id = v_profile.selected_badge_id,
    list_visibility = v_profile.list_visibility, profile_visibility = v_profile.profile_visibility,
    push_enabled = v_profile.push_enabled, achievement_sound_enabled = v_profile.achievement_sound_enabled
  where id = auth.uid();
  return jsonb_build_object('status', 'UPDATED', 'profile_id', auth.uid());
exception when unique_violation then raise exception 'USERNAME_TAKEN';
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.complete_profile_setup(text, text, text) from public, anon, authenticated;
revoke all on function public.update_profile(jsonb) from public, anon, authenticated;
grant execute on function public.complete_profile_setup(text, text, text), public.update_profile(jsonb) to authenticated;

-- Ownership must remain valid even if a trusted backend revokes an achievement.
alter table public.profiles add constraint profiles_selected_badge_ownership_fkey
  foreign key (id, selected_badge_id)
  references public.user_achievements(user_id, achievement_key)
  on delete set null (selected_badge_id);
revoke all on function public.validate_selected_badge() from public, anon, authenticated;

commit;
