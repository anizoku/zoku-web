-- Automatically create a public profile for every new Supabase Auth user.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    username,
    display_name
  )
  values (
    new.id,
    'user_' || replace(new.id::text, '-', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for Auth users that already existed before this trigger.
insert into public.profiles (
  id,
  username,
  display_name
)
select
  u.id,
  'user_' || replace(u.id::text, '-', ''),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', '')
  )
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);