-- ManaPair: unique usernames, friends, co-admins, cancellation and adaptive pairings.

alter table public.profiles add column if not exists username text;
update public.profiles
set username = 'player_' || substr(replace(user_id::text, '-', ''), 1, 8)
where username is null;
alter table public.profiles alter column username set not null;
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (username ~ '^[a-z0-9_]{3,24}$' and username = lower(username));
create unique index if not exists profiles_username_unique on public.profiles(username);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  addressee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_unique_pair
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);
alter table public.friendships enable row level security;
drop policy if exists friendships_read_parties on public.friendships;
drop policy if exists friendships_insert_requester on public.friendships;
drop policy if exists friendships_update_recipient on public.friendships;
drop policy if exists friendships_delete_parties on public.friendships;
create policy friendships_read_parties on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));
create policy friendships_insert_requester on public.friendships for insert to authenticated
with check (requester_id = (select auth.uid()) and requester_id <> addressee_id and status = 'pending');
create policy friendships_update_recipient on public.friendships for update to authenticated
using (addressee_id = (select auth.uid()))
with check (addressee_id = (select auth.uid()));
create policy friendships_delete_parties on public.friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));
grant select, insert, delete on public.friendships to authenticated;
grant update(status, updated_at) on public.friendships to authenticated;

create table if not exists public.tournament_admins (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  added_by uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
create index if not exists tournament_admins_user_idx on public.tournament_admins(user_id, created_at desc);
alter table public.tournament_admins enable row level security;
drop policy if exists tournament_admins_public_read on public.tournament_admins;
drop policy if exists tournament_admins_owner_insert on public.tournament_admins;
drop policy if exists tournament_admins_owner_delete on public.tournament_admins;
create policy tournament_admins_public_read on public.tournament_admins for select to anon, authenticated using (true);
create policy tournament_admins_owner_insert on public.tournament_admins for insert to authenticated
with check (
  added_by = (select auth.uid())
  and user_id <> (select auth.uid())
  and exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid()))
);
create policy tournament_admins_owner_delete on public.tournament_admins for delete to authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
grant select on public.tournament_admins to anon, authenticated;
grant insert, delete on public.tournament_admins to authenticated;

create or replace function public.is_tournament_admin(p_tournament_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = p_tournament_id
      and (
        t.created_by = (select auth.uid())
        or exists (
          select 1 from public.tournament_admins ta
          where ta.tournament_id = t.id and ta.user_id = (select auth.uid())
        )
      )
  );
$$;
revoke all on function public.is_tournament_admin(uuid) from public;
grant execute on function public.is_tournament_admin(uuid) to anon, authenticated;

alter table public.tournaments add column if not exists resolved_matches_per_player smallint;
alter table public.tournaments add column if not exists cancelled_at timestamptz;
alter table public.tournaments add column if not exists cancelled_by uuid references public.profiles(user_id) on delete set null;
alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments add constraint tournaments_status_check check (status in ('registration','active','completed','cancelled'));
alter table public.tournaments drop constraint if exists tournaments_resolved_matches_per_player_check;
alter table public.tournaments add constraint tournaments_resolved_matches_per_player_check check (resolved_matches_per_player is null or resolved_matches_per_player between 1 and 20);

drop policy if exists tournaments_update_admin on public.tournaments;
create policy tournaments_update_admin on public.tournaments for update to authenticated
using (public.is_tournament_admin(id))
with check (public.is_tournament_admin(id));
revoke update on public.tournaments from authenticated;
grant update(name, description, format, mode, status, starts_at, ends_at, registration_deadline, matches_per_player, max_players, resolved_matches_per_player, cancelled_at, cancelled_by, updated_at) on public.tournaments to authenticated;

drop policy if exists tournament_players_admin_delete on public.tournament_players;
create policy tournament_players_admin_delete on public.tournament_players for delete to authenticated
using (public.is_tournament_admin(tournament_id) and exists (select 1 from public.tournaments t where t.id=tournament_id and t.status='registration'));

drop policy if exists tournament_matches_admin_insert on public.tournament_matches;
drop policy if exists tournament_matches_admin_update on public.tournament_matches;
drop policy if exists tournament_matches_player_report on public.tournament_matches;
create policy tournament_matches_admin_insert on public.tournament_matches for insert to authenticated
with check (public.is_tournament_admin(tournament_id));
create policy tournament_matches_admin_update on public.tournament_matches for update to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));
create policy tournament_matches_player_report on public.tournament_matches for update to authenticated
using (
  status='pending'
  and (select auth.uid()) in(player_a,player_b)
  and exists (select 1 from public.tournaments t where t.id=tournament_id and t.status='active')
)
with check (
  status='reported'
  and (select auth.uid()) in(player_a,player_b)
  and reported_by=(select auth.uid())
  and exists (select 1 from public.tournaments t where t.id=tournament_id and t.status='active')
);

drop policy if exists tournament_matches_relevant_read on public.tournament_matches;
create policy tournament_matches_relevant_read on public.tournament_matches for select to anon,authenticated
using (
  exists(select 1 from public.tournaments t where t.id=tournament_id and t.status='completed')
  or player_a=(select auth.uid())
  or player_b=(select auth.uid())
  or public.is_tournament_admin(tournament_id)
  or exists(select 1 from public.tournament_players tp where tp.tournament_id=tournament_id and tp.user_id=(select auth.uid()) and tp.dropped_at is null)
);

drop policy if exists disputes_read_relevant on public.match_disputes;
drop policy if exists disputes_update_admin on public.match_disputes;
create policy disputes_read_relevant on public.match_disputes for select to authenticated
using (
  raised_by=(select auth.uid())
  or exists(
    select 1 from public.tournament_matches m
    where m.id=match_id
      and (m.player_a=(select auth.uid()) or m.player_b=(select auth.uid()) or public.is_tournament_admin(m.tournament_id))
  )
);
create policy disputes_update_admin on public.match_disputes for update to authenticated
using (exists(select 1 from public.tournament_matches m where m.id=match_id and public.is_tournament_admin(m.tournament_id)))
with check (exists(select 1 from public.tournament_matches m where m.id=match_id and public.is_tournament_admin(m.tournament_id)));

drop policy if exists decklists_read_private_then_public on public.decklists;
create policy decklists_read_private_then_public on public.decklists for select to anon,authenticated
using (
  exists(select 1 from public.tournaments t where t.id=tournament_id and t.status='completed')
  or user_id=(select auth.uid())
  or public.is_tournament_admin(tournament_id)
);
drop policy if exists decklist_cards_read_private_then_public on public.decklist_cards;
create policy decklist_cards_read_private_then_public on public.decklist_cards for select to anon,authenticated
using (
  exists(
    select 1 from public.decklists d
    join public.tournaments t on t.id=d.tournament_id
    where d.id=decklist_id
      and (t.status='completed' or d.user_id=(select auth.uid()) or public.is_tournament_admin(d.tournament_id))
  )
);

create or replace function public.start_tournament(p_tournament_id uuid)
returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  t public.tournaments%rowtype;
  players uuid[];
  n integer;
  requested_k integer;
  k integer;
  offset_n integer;
  i integer;
  j integer;
  inserted_count integer := 0;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournament not found.'; end if;
  if not public.is_tournament_admin(p_tournament_id) then raise exception 'Only a tournament admin can start this tournament.'; end if;
  if t.status <> 'registration' then raise exception 'This tournament cannot be started.'; end if;
  select array_agg(user_id order by random()) into players from public.tournament_players where tournament_id=p_tournament_id and dropped_at is null;
  n := coalesce(array_length(players,1),0);
  requested_k := t.matches_per_player;
  if n < 2 then raise exception 'At least two players are required.'; end if;
  k := least(requested_k, n - 1);
  if mod(n * k, 2) = 1 then k := k - 1; end if;
  if k < 1 then raise exception 'A fair schedule is impossible with % registered players and a limit of % match per player. Increase matches per player or add a player.', n, requested_k; end if;
  if exists(select 1 from public.tournament_matches where tournament_id=p_tournament_id) then raise exception 'Pairings already exist for this tournament.'; end if;
  if mod(k,2)=1 then for i in 1..(n/2) loop insert into public.tournament_matches(tournament_id,player_a,player_b) values(p_tournament_id,players[i],players[i+(n/2)]); inserted_count := inserted_count + 1; end loop; end if;
  for offset_n in 1..(k/2) loop for i in 1..n loop j := ((i-1+offset_n)%n)+1; insert into public.tournament_matches(tournament_id,player_a,player_b) values(p_tournament_id,players[i],players[j]); inserted_count := inserted_count + 1; end loop; end loop;
  update public.tournaments set status='active', resolved_matches_per_player=k, updated_at=now() where id=p_tournament_id;
  return inserted_count;
end;
$$;
revoke all on function public.start_tournament(uuid) from public;
grant execute on function public.start_tournament(uuid) to authenticated;

create or replace function public.finish_tournament(p_tournament_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if not public.is_tournament_admin(p_tournament_id) then raise exception 'Only a tournament admin can finish this tournament.'; end if;
  if not exists(select 1 from public.tournaments where id=p_tournament_id and status='active') then raise exception 'Only an active tournament can be finished.'; end if;
  update public.tournaments set status='completed', updated_at=now() where id=p_tournament_id;
end;
$$;
revoke all on function public.finish_tournament(uuid) from public;
grant execute on function public.finish_tournament(uuid) to authenticated;

create or replace function public.cancel_tournament(p_tournament_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if not public.is_tournament_admin(p_tournament_id) then raise exception 'Only a tournament admin can cancel this tournament.'; end if;
  if exists(select 1 from public.tournaments where id=p_tournament_id and status='completed') then raise exception 'A completed tournament cannot be cancelled.'; end if;
  if exists(select 1 from public.tournaments where id=p_tournament_id and status='cancelled') then return; end if;
  update public.tournaments set status='cancelled', cancelled_at=now(), cancelled_by=(select auth.uid()), updated_at=now() where id=p_tournament_id;
end;
$$;
revoke all on function public.cancel_tournament(uuid) from public;
grant execute on function public.cancel_tournament(uuid) to authenticated;

create or replace view public.player_overall_stats with (security_invoker=true) as
with score_rows as (
  select m.player_a user_id,m.player_a_wins own_wins,m.player_b_wins opp_wins from public.tournament_matches m join public.tournaments t on t.id=m.tournament_id where m.status='reported' and t.status<>'cancelled'
  union all
  select m.player_b,m.player_b_wins,m.player_a_wins from public.tournament_matches m join public.tournaments t on t.id=m.tournament_id where m.status='reported' and t.status<>'cancelled'
)
select p.user_id,p.display_name,count(sr.user_id)::integer played,count(*) filter(where sr.own_wins>sr.opp_wins)::integer wins,count(*) filter(where sr.own_wins=sr.opp_wins)::integer draws,count(*) filter(where sr.own_wins<sr.opp_wins)::integer losses,case when count(sr.user_id)=0 then 0::numeric else round((count(*) filter(where sr.own_wins>sr.opp_wins))::numeric*100/count(sr.user_id),1) end win_rate from public.profiles p left join score_rows sr on sr.user_id=p.user_id group by p.user_id,p.display_name;
