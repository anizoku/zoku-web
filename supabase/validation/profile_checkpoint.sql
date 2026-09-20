-- Read-only post-deployment checks. Safe on --local or --linked.
select jsonb_build_object(
  'rls_enabled', (select relrowsecurity from pg_class where oid='public.profiles'::regclass),
  'view_invoker', (select reloptions @> array['security_invoker=true'] from pg_class where oid='public.public_profiles'::regclass),
  'no_client_column_writes', not exists (
    select 1 from pg_attribute a cross join (values ('anon'),('authenticated')) r(role)
    where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped
      and (has_column_privilege(r.role,a.attrelid,a.attnum,'UPDATE')
        or has_column_privilege(r.role,a.attrelid,a.attnum,'INSERT'))),
  'no_client_table_writes', not exists (
    select 1 from unnest(array['anon','authenticated']) r
    where has_table_privilege(r,'public.profiles','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')),
  'no_client_private_column_reads', not exists (
    select 1 from unnest(array['anon','authenticated']) r
    cross join unnest(array['legacy_base44_id','preferred_language','favorite_mangas','profile_setup_completed',
      'profile_setup_completed_at','push_enabled','achievement_sound_enabled','current_streak','last_activity_date',
      'login_streak','role','updated_at']) c
    where has_column_privilege(r,'public.profiles',c,'SELECT')),
  'public_columns_readable', not exists (
    select 1 from unnest(array['anon','authenticated']) r
    cross join information_schema.columns c
    where c.table_schema='public' and c.table_name='public_profiles'
      and not has_column_privilege(r,'public.profiles',c.column_name,'SELECT')),
  'two_private_buckets', (select count(*)=2 and bool_and(not public) from storage.buckets
    where id in ('avatars','profile-banners')),
  'badge_ownership_validated', exists (select 1 from pg_constraint
    where conrelid='public.profiles'::regclass and conname='profiles_selected_badge_ownership_fkey' and convalidated),
  'crop_paths_validated', (select count(*)=2 and bool_and(convalidated) from pg_constraint
    where conrelid='public.profiles'::regclass and conname in ('profiles_avatar_crop_path_check','profiles_banner_crop_path_check')),
  'profile_rpc_definitions_md5', (select md5(string_agg(pg_get_functiondef(p.oid), E'\n' order by p.proname))
    from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('update_profile',
    'get_my_profile','complete_profile_setup','handle_new_user','set_avatar','set_banner','remove_avatar','remove_banner')),
  'profile_count', (select count(*) from public.profiles)
) as checkpoint;
