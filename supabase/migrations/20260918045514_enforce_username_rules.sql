-- Enforce Zoku username format and reserved terms.
-- Also shorten automatically generated temporary usernames
-- so they comply with the 24-character limit.

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
    'u_' || substring(replace(new.id::text, '-', '') from 1 for 22),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Convert any existing automatically generated temporary usernames.
update public.profiles
set username = 'u_' || substring(replace(id::text, '-', '') from 1 for 22)
where username like 'user_%';

alter table public.profiles
add constraint profiles_username_format_check
check (
  char_length(username) between 3 and 24
  and username ~ '^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$'
  and username !~ '__'
);

alter table public.profiles
add constraint profiles_username_reserved_check
check (
  lower(username) not like '%admin%'
  and lower(username) not like '%administrator%'
  and lower(username) not like '%administrador%'
);