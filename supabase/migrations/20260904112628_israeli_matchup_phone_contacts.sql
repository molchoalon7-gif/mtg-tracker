alter table public.user_contacts add column if not exists phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_contacts'::regclass
      and conname = 'user_contacts_phone_israeli_mobile'
  ) then
    alter table public.user_contacts
      add constraint user_contacts_phone_israeli_mobile
      check (phone is null or phone ~ '^05[0-9]{8}$');
  end if;
end $$;

create or replace function private.sync_auth_email_to_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  if new.email is not null then
    v_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''), '[^0-9]', '', 'g');
    if v_phone !~ '^05[0-9]{8}$' then
      v_phone := null;
    end if;

    insert into public.user_contacts as uc(user_id,email,phone,updated_at)
    values(new.id,new.email,v_phone,now())
    on conflict (user_id) do update
      set email = excluded.email,
          phone = coalesce(excluded.phone, uc.phone),
          updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_auth_email_to_contact() from public, anon, authenticated;

drop trigger if exists sync_auth_email_to_contact on auth.users;
create trigger sync_auth_email_to_contact
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function private.sync_auth_email_to_contact();

create or replace function public.set_contact_phone(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  v_email text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;
  if v_phone !~ '^05[0-9]{8}$' then
    raise exception 'Phone number must be a 10-digit Israeli mobile number starting with 05.';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;
  if v_email is null then
    raise exception 'Account email not found.';
  end if;

  insert into public.user_contacts(user_id,email,phone,updated_at)
  values(v_uid,v_email,v_phone,now())
  on conflict (user_id) do update
    set phone = excluded.phone,
        email = excluded.email,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.set_contact_phone(text) from public, anon;
grant execute on function public.set_contact_phone(text) to authenticated;

create or replace function public.enforce_tournament_registration()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  t public.tournaments%rowtype;
  current_players integer;
  d public.decklists%rowtype;
begin
  select * into t from public.tournaments where id = new.tournament_id for update;
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
  select * into d from public.decklists where id = new.decklist_id;
  if not found or d.tournament_id <> new.tournament_id or d.user_id <> new.user_id then
    raise exception 'Decklist must belong to this player and tournament.';
  end if;
  if not exists (select 1 from public.decklist_cards where decklist_id = new.decklist_id and section = 'main') then
    raise exception 'Decklist must contain at least one main-deck card.';
  end if;
  if t.max_players is not null then
    select count(*) into current_players from public.tournament_players where tournament_id = new.tournament_id and dropped_at is null;
    if current_players >= t.max_players then raise exception 'This tournament is full.'; end if;
  end if;
  return new;
end;
$$;
