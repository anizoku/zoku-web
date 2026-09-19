create or replace function public.validate_selected_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Permite remover o badge selecionado.
  if new.selected_badge_id is null then
    return new;
  end if;

  -- O badge precisa existir no catálogo de achievements.
  if not exists (
    select 1
    from public.achievements
    where key = new.selected_badge_id
  ) then
    raise exception 'INVALID_BADGE';
  end if;

  -- O usuário só pode exibir um achievement que já desbloqueou.
  if not exists (
    select 1
    from public.user_achievements
    where user_id = new.id
      and achievement_key = new.selected_badge_id
  ) then
    raise exception 'BADGE_NOT_UNLOCKED';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_selected_badge
on public.profiles;

create trigger trg_validate_selected_badge
before insert or update of selected_badge_id
on public.profiles
for each row
execute function public.validate_selected_badge();