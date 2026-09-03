revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.tournaments from anon, authenticated;
revoke all privileges on table public.tournament_players from anon, authenticated;
revoke all privileges on table public.tournament_matches from anon, authenticated;
revoke all privileges on table public.match_disputes from anon, authenticated;
revoke all privileges on table public.decklists from anon, authenticated;
revoke all privileges on table public.decklist_cards from anon, authenticated;
revoke all privileges on table public.friendships from anon, authenticated;
revoke all privileges on table public.tournament_admins from anon, authenticated;
revoke all privileges on table public.tournament_standings from anon, authenticated;
revoke all privileges on table public.player_overall_stats from anon, authenticated;

grant select on table public.profiles, public.tournaments, public.tournament_players, public.tournament_admins, public.tournament_matches, public.decklists, public.decklist_cards, public.tournament_standings, public.player_overall_stats to anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.tournaments to authenticated;
grant select, insert, delete on table public.tournament_players to authenticated;
grant select, insert, update on table public.tournament_matches to authenticated;
grant select, insert, update on table public.match_disputes to authenticated;
grant select, insert, delete on table public.decklists to authenticated;
grant select, insert on table public.decklist_cards to authenticated;
grant select, insert, update, delete on table public.friendships to authenticated;
grant select, insert, delete on table public.tournament_admins to authenticated;
grant select on table public.tournament_standings, public.player_overall_stats to authenticated;
