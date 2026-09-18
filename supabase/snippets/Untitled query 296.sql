begin;

select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from auth.users
    order by created_at desc
    limit 1
  ),
  true
);

set local role authenticated;

select public.complete_profile_setup(
  'RaphaelTest',
  'Raphael',
  'pt'
);

rollback;