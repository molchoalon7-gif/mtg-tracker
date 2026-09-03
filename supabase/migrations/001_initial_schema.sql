create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or char_length(username) between 3 and 32),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  format text not null check (char_length(format) between 1 and 40),
  decklist text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  source text not null default 'manual',
  source_url text,
  name text not null,
  format text not null,
  platform text not null,
  starts_at timestamptz not null,
  player_count integer check (player_count is null or player_count >= 0),
  registration_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  played_at timestamptz not null default now(),
  format text not null,
  opponent_deck text not null check (char_length(opponent_deck) between 1 and 120),
  result text not null check (result in ('W','L','D')),
  games_won integer not null default 0 check (games_won >= 0),
  games_lost integer not null default 0 check (games_lost >= 0),
  games_drawn integer not null default 0 check (games_drawn >= 0),
  play_draw text check (play_draw in ('play','draw')),
  round text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_user_played_idx on public.matches (user_id, played_at desc);
create index decks_user_idx on public.decks (user_id, created_at desc);
create index tournaments_starts_idx on public.tournaments (starts_at);

alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.matches enable row level security;
alter table public.tournaments enable row level security;

create policy "profiles public read" on public.profiles for select to anon, authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "decks read own" on public.decks for select to authenticated using ((select auth.uid()) = user_id);
create policy "decks insert own" on public.decks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "decks update own" on public.decks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "decks delete own" on public.decks for delete to authenticated using ((select auth.uid()) = user_id);

create policy "matches read own" on public.matches for select to authenticated using ((select auth.uid()) = user_id);
create policy "matches insert own" on public.matches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "matches update own" on public.matches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "matches delete own" on public.matches for delete to authenticated using ((select auth.uid()) = user_id);

create policy "tournaments public read" on public.tournaments for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on public.tournaments to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, update, delete on public.matches to authenticated;

insert into public.tournaments (external_id, source, source_url, name, format, platform, starts_at, registration_url)
values
  ('2026-09-05-limited-rcq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Limited RC Qualifier', 'HOB Sealed', 'MTGO', '2026-09-05T21:00:00Z', 'https://www.mtgo.com/premier-play'),
  ('2026-09-06-pioneer-superq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Pioneer RC Super Qualifier', 'Pioneer', 'MTGO', '2026-09-06T14:00:00Z', 'https://www.mtgo.com/premier-play'),
  ('2026-09-07-limited-superq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Limited RC Super Qualifier', 'HOB Sealed', 'MTGO', '2026-09-07T14:00:00Z', 'https://www.mtgo.com/premier-play'),
  ('2026-09-13-pioneer-rcq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Pioneer RC Qualifier', 'Pioneer', 'MTGO', '2026-09-13T07:00:00Z', 'https://www.mtgo.com/premier-play'),
  ('2026-09-19-modern-rcq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Modern RC Qualifier', 'Modern', 'MTGO', '2026-09-19T14:00:00Z', 'https://www.mtgo.com/premier-play'),
  ('2026-09-20-pauper-superq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Pauper RC Super Qualifier', 'Pauper', 'MTGO', '2026-09-20T14:00:00Z', 'https://www.mtgo.com/premier-play'),
  ('2026-09-27-vintage-rcq', 'MTGO Premier Play', 'https://www.mtgo.com/premier-play', 'Vintage RC Qualifier', 'Vintage', 'MTGO', '2026-09-27T14:00:00Z', 'https://www.mtgo.com/premier-play');
