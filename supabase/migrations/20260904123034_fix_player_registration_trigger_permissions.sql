create or replace function public.enforce_tournament_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tournaments%rowtype;
  current_players integer;
  d public.decklists%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null or new.user_id <> v_uid then
    raise exception 'You can only register yourself.';
  end if;

  select * into t
  from public.tournaments
  where id = new.tournament_id
  for update;

  if not found then raise exception 'Tournament not found.'; end if;
  if t.status <> 'registration' then raise exception 'Registration is closed.'; end if;
  if now() > t.registration_deadline then raise exception 'The registration deadline has passed.'; end if;

  if not exists (
    select 1 from public.user_contacts c
    where c.user_id = new.user_id and c.phone ~ '^05[0-9]{8}$'
  ) then
    raise exception 'Add a valid Israeli mobile number in Profile before registering.';
  end if;

  if new.decklist_id is null then raise exception 'A decklist is required to register.'; end if;

  select * into d
  from public.decklists
  where id = new.decklist_id;

  if not found or d.tournament_id <> new.tournament_id or d.user_id <> new.user_id then
    raise exception 'Decklist must belong to this player and tournament.';
  end if;

  if not exists (
    select 1 from public.decklist_cards
    where decklist_id = new.decklist_id and section = 'main'
  ) then
    raise exception 'Decklist must contain at least one main-deck card.';
  end if;

  if t.max_players is not null then
    select count(*) into current_players
    from public.tournament_players
    where tournament_id = new.tournament_id and dropped_at is null;
    if current_players >= t.max_players then raise exception 'This tournament is full.'; end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_tournament_registration() from public, anon, authenticated;
