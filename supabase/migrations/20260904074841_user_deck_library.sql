create table public.user_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  format text not null default 'Open' check (char_length(format) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_decks_user_updated_idx on public.user_decks(user_id, updated_at desc);

create table public.user_deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.user_decks(id) on delete cascade,
  card_name text not null,
  scryfall_id text,
  oracle_id text,
  quantity smallint not null check (quantity between 1 and 250),
  section text not null check (section in ('main','sideboard')),
  created_at timestamptz not null default now()
);

create index user_deck_cards_deck_idx on public.user_deck_cards(deck_id);

alter table public.user_decks enable row level security;
alter table public.user_deck_cards enable row level security;

create policy user_decks_select_own
on public.user_decks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_decks_insert_own
on public.user_decks for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy user_decks_update_own
on public.user_decks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_decks_delete_own
on public.user_decks for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy user_deck_cards_select_own
on public.user_deck_cards for select
to authenticated
using (
  deck_id in (
    select d.id from public.user_decks d
    where d.user_id = (select auth.uid())
  )
);

create policy user_deck_cards_insert_own
on public.user_deck_cards for insert
to authenticated
with check (
  deck_id in (
    select d.id from public.user_decks d
    where d.user_id = (select auth.uid())
  )
);

create policy user_deck_cards_update_own
on public.user_deck_cards for update
to authenticated
using (
  deck_id in (
    select d.id from public.user_decks d
    where d.user_id = (select auth.uid())
  )
)
with check (
  deck_id in (
    select d.id from public.user_decks d
    where d.user_id = (select auth.uid())
  )
);

create policy user_deck_cards_delete_own
on public.user_deck_cards for delete
to authenticated
using (
  deck_id in (
    select d.id from public.user_decks d
    where d.user_id = (select auth.uid())
  )
);

revoke all on table public.user_decks from anon, authenticated;
revoke all on table public.user_deck_cards from anon, authenticated;
grant select, insert, update, delete on table public.user_decks to authenticated;
grant select, insert, update, delete on table public.user_deck_cards to authenticated;
