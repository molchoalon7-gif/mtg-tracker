drop policy if exists tournament_matches_relevant_read on public.tournament_matches;
create policy tournament_matches_relevant_read on public.tournament_matches
for select to anon, authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_matches.tournament_id
      and t.status = 'completed'
  )
  or player_a = (select auth.uid())
  or player_b = (select auth.uid())
  or public.is_tournament_admin(tournament_matches.tournament_id)
);
