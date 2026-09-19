alter table public.profiles
add constraint profiles_display_name_length_check
check (
  display_name is null
  or char_length(trim(display_name)) between 1 and 50
);

alter table public.profiles
add constraint profiles_bio_length_check
check (
  bio is null
  or char_length(bio) <= 300
);

alter table public.profiles
add constraint profiles_country_format_check
check (
  country is null
  or country ~ '^[A-Z]{2}$'
);