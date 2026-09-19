create or replace function public.is_valid_profile_crop(p_crop jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_keys text[];
begin
  if p_crop is null then
    return true;
  end if;

  if jsonb_typeof(p_crop) <> 'object' then
    return false;
  end if;

  -- Accept only the fields currently produced by the frontend.
  select array_agg(key order by key)
  into v_keys
  from jsonb_object_keys(p_crop) as key;

  if v_keys is distinct from array[
    'imageUrl',
    'offsetXPct',
    'offsetYPct',
    'version',
    'zoom'
  ]::text[] then
    return false;
  end if;

  if jsonb_typeof(p_crop->'version') <> 'number'
     or (p_crop->>'version')::numeric <> 2 then
    return false;
  end if;

  if jsonb_typeof(p_crop->'zoom') <> 'number'
     or (p_crop->>'zoom')::numeric < 1
     or (p_crop->>'zoom')::numeric > 10 then
    return false;
  end if;

  if jsonb_typeof(p_crop->'offsetXPct') <> 'number'
     or (p_crop->>'offsetXPct')::numeric < -100
     or (p_crop->>'offsetXPct')::numeric > 100 then
    return false;
  end if;

  if jsonb_typeof(p_crop->'offsetYPct') <> 'number'
     or (p_crop->>'offsetYPct')::numeric < -100
     or (p_crop->>'offsetYPct')::numeric > 100 then
    return false;
  end if;

  if jsonb_typeof(p_crop->'imageUrl') <> 'string'
     or char_length(trim(p_crop->>'imageUrl')) = 0
     or char_length(p_crop->>'imageUrl') > 1000 then
    return false;
  end if;

  return true;

exception
  when others then
    return false;
end;
$$;

alter table public.profiles
add constraint profiles_avatar_crop_format_check
check (public.is_valid_profile_crop(avatar_crop));

alter table public.profiles
add constraint profiles_banner_crop_format_check
check (public.is_valid_profile_crop(banner_crop));