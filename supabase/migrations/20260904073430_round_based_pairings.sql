alter table public.tournaments
  add column if not exists round_count smallint null
  check (round_count is null or round_count between 1 and 256);

alter table public.tournament_matches
  add column if not exists round_number smallint not null default 1
  check (round_number >= 1);

create index if not exists tournament_matches_round_idx
  on public.tournament_matches (tournament_id, round_number);

create or replace function public.start_tournament(
  p_tournament_id uuid,
  p_rounds integer
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  t public.tournaments%rowtype;
  players uuid[];
  rotation uuid[];
  next_rotation uuid[];
  n integer;
  slot_count integer;
  max_rounds integer;
  round_no integer;
  i integer;
  player_a_id uuid;
  player_b_id uuid;
  inserted_count integer := 0;
begin
  select * into t
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found.';
  end if;

  if not public.is_tournament_admin(p_tournament_id) then
    raise exception 'Only a tournament admin can start this tournament.';
  end if;

  if t.status <> 'registration' then
    raise exception 'This tournament cannot be started.';
  end if;

  select array_agg(user_id order by random())
  into players
  from public.tournament_players
  where tournament_id = p_tournament_id
    and dropped_at is null;

  n := coalesce(array_length(players, 1), 0);
  if n < 2 then
    raise exception 'At least two players are required.';
  end if;

  max_rounds := case when mod(n, 2) = 0 then n - 1 else n end;
  if p_rounds is null or p_rounds < 1 or p_rounds > max_rounds then
    raise exception 'Choose between 1 and % rounds for % registered players.', max_rounds, n;
  end if;

  if exists (
    select 1 from public.tournament_matches
    where tournament_id = p_tournament_id
  ) then
    raise exception 'Pairings already exist for this tournament.';
  end if;

  if mod(n, 2) = 1 then
    rotation := array_append(players, null::uuid);
    slot_count := n + 1;
  else
    rotation := players;
    slot_count := n;
  end if;

  for round_no in 1..p_rounds loop
    for i in 1..(slot_count / 2) loop
      player_a_id := rotation[i];
      player_b_id := rotation[slot_count + 1 - i];

      if player_a_id is not null and player_b_id is not null then
        insert into public.tournament_matches(
          tournament_id,
          player_a,
          player_b,
          round_number
        ) values (
          p_tournament_id,
          player_a_id,
          player_b_id,
          round_no
        );
        inserted_count := inserted_count + 1;
      end if;
    end loop;

    next_rotation := array_fill(null::uuid, array[slot_count]);
    next_rotation[1] := rotation[1];
    next_rotation[2] := rotation[slot_count];
    if slot_count > 2 then
      for i in 3..slot_count loop
        next_rotation[i] := rotation[i - 1];
      end loop;
    end if;
    rotation := next_rotation;
  end loop;

  update public.tournaments
  set status = 'active',
      round_count = p_rounds,
      matches_per_player = p_rounds,
      resolved_matches_per_player = case when mod(n, 2) = 0 then p_rounds else null end,
      updated_at = now()
  where id = p_tournament_id;

  return inserted_count;
end;
$$;

revoke all on function public.start_tournament(uuid, integer) from public;
revoke all on function public.start_tournament(uuid, integer) from anon;
grant execute on function public.start_tournament(uuid, integer) to authenticated;
