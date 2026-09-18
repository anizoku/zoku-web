-- Enforce minimum requirements before profile setup can be completed.

alter table public.profiles
add constraint profiles_setup_requirements_check
check (
  profile_setup_completed = false
  or (
    username is not null
    and char_length(trim(username)) between 3 and 24
    and display_name is not null
    and char_length(trim(display_name)) >= 1
    and preferred_language in ('pt', 'en')
  )
);