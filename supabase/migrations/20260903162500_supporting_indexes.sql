create index if not exists decklists_user_idx on public.decklists(user_id);
create index if not exists match_disputes_raised_by_idx on public.match_disputes(raised_by);
create index if not exists match_disputes_resolved_by_idx on public.match_disputes(resolved_by) where resolved_by is not null;
create index if not exists tournament_admins_added_by_idx on public.tournament_admins(added_by);
create index if not exists tournament_matches_reported_by_idx on public.tournament_matches(reported_by) where reported_by is not null;
create index if not exists tournaments_cancelled_by_idx on public.tournaments(cancelled_by) where cancelled_by is not null;
create index if not exists tournaments_created_by_idx on public.tournaments(created_by, created_at desc);
