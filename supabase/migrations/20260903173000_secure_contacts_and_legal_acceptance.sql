create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists public.user_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  updated_at timestamptz not null default now()
);

insert into public.user_contacts(user_id,email,updated_at)
select id,email,now() from auth.users where email is not null
on conflict (user_id) do update set email=excluded.email, updated_at=excluded.updated_at;

alter table public.user_contacts enable row level security;
drop policy if exists user_contacts_pairing_read on public.user_contacts;
create policy user_contacts_pairing_read on public.user_contacts
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.tournament_matches m
    join public.tournaments t on t.id=m.tournament_id
    where t.status='active'
      and (
        (m.player_a=(select auth.uid()) and m.player_b=user_contacts.user_id)
        or (m.player_b=(select auth.uid()) and m.player_a=user_contacts.user_id)
      )
  )
);
revoke all on table public.user_contacts from anon;
revoke insert, update, delete on table public.user_contacts from authenticated;
grant select on table public.user_contacts to authenticated;

create or replace function private.sync_auth_email_to_contact()
returns trigger
language plpgsql
security definer
set search_path=public,auth,private
as $$
begin
  if new.email is not null then
    insert into public.user_contacts(user_id,email,updated_at)
    values(new.id,new.email,now())
    on conflict (user_id) do update set email=excluded.email, updated_at=excluded.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_auth_email_to_contact() from public, anon, authenticated;

drop trigger if exists sync_auth_email_to_contact on auth.users;
create trigger sync_auth_email_to_contact
after insert or update of email on auth.users
for each row execute function private.sync_auth_email_to_contact();

create table if not exists public.legal_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  primary key(user_id,terms_version)
);
alter table public.legal_acceptances enable row level security;
drop policy if exists legal_acceptances_read_self on public.legal_acceptances;
drop policy if exists legal_acceptances_insert_self on public.legal_acceptances;
create policy legal_acceptances_read_self on public.legal_acceptances
for select to authenticated using (user_id=(select auth.uid()));
create policy legal_acceptances_insert_self on public.legal_acceptances
for insert to authenticated with check (user_id=(select auth.uid()));
revoke all on table public.legal_acceptances from anon;
revoke update, delete on table public.legal_acceptances from authenticated;
grant select, insert on table public.legal_acceptances to authenticated;

create index if not exists legal_acceptances_user_idx on public.legal_acceptances(user_id,accepted_at desc);
