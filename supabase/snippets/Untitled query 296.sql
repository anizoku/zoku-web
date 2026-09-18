with test as (
  select
    'u_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 22) as username
)
select
  username,
  char_length(username) as length,
  username ~ '^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$' as format_ok,
  username not like '%__%' as no_double_underscore,
  lower(username) not like '%admin%' as reserved_ok
from test;