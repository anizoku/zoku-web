begin;

insert into public.achievements (
  key,
  name,
  description,
  category,
  xp
)
values (
  'test_badge',
  'Test Badge',
  'Temporary badge for validation test',
  'test',
  0
);

insert into public.user_achievements (
  user_id,
  achievement_key
)
values (
  'ea72e1ad-68d0-43ff-9344-489a573bc9c9',
  'test_badge'
);

update public.profiles
set selected_badge_id = 'test_badge'
where id = 'ea72e1ad-68d0-43ff-9344-489a573bc9c9';

select selected_badge_id
from public.profiles
where id = 'ea72e1ad-68d0-43ff-9344-489a573bc9c9';

rollback;