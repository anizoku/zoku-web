create or replace function public.is_valid_profile_links(p_links jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_url text;
begin
  if p_links is null or jsonb_typeof(p_links) <> 'object' then
    return false;
  end if;

  for v_key, v_value in
    select key, value
    from jsonb_each(p_links)
  loop
    if v_key not in ('instagram', 'x', 'tiktok', 'youtube', 'website') then
      return false;
    end if;

    if jsonb_typeof(v_value) <> 'string' then
      return false;
    end if;

    v_url := trim(v_value #>> '{}');

    if char_length(v_url) = 0
       or char_length(v_url) > 300
       or v_url !~* '^https?://[^[:space:]]+$'
    then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

alter table public.profiles
add constraint profiles_links_format_check
check (public.is_valid_profile_links(links));