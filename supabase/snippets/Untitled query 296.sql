begin;


-- Inválido: zoom abaixo de 1
update public.profiles
set avatar_crop = '{
  "version": 2,
  "zoom": 0.5,
  "offsetXPct": 0,
  "offsetYPct": 0,
  "imageUrl": "ea72e1ad-68d0-43ff-9344-489a573bc9c9/avatar.jpg"
}'::jsonb
where id = 'ea72e1ad-68d0-43ff-9344-489a573bc9c9';

rollback;