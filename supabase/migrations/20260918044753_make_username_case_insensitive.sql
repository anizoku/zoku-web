-- Make usernames case-insensitive for uniqueness.
-- "Raphael", "raphael" and "RAPHAEL" must be treated as the same username.

alter table public.profiles
drop constraint if exists uq_profiles_username;

create unique index uq_profiles_username_ci
on public.profiles (lower(username));