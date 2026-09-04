create or replace function public.save_user_deck(
  p_deck_id uuid,
  p_name text,
  p_format text,
  p_cards jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_uid uuid := (select auth.uid());
  v_deck_id uuid;
  v_inserted integer;
begin
  if v_uid is null then
    raise exception 'Sign in to save a deck.';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 80 then
    raise exception 'Deck name must be between 1 and 80 characters.';
  end if;
  if char_length(trim(coalesce(p_format,''))) not between 1 and 40 then
    raise exception 'Choose a valid format.';
  end if;
  if p_cards is null or jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    raise exception 'Decklist must contain at least one card.';
  end if;

  if p_deck_id is null then
    insert into public.user_decks(user_id,name,format)
    values(v_uid,trim(p_name),trim(p_format))
    returning id into v_deck_id;
  else
    update public.user_decks
      set name=trim(p_name), format=trim(p_format), updated_at=now()
    where id=p_deck_id and user_id=v_uid
    returning id into v_deck_id;
    if v_deck_id is null then raise exception 'Deck not found.'; end if;
    delete from public.user_deck_cards where deck_id=v_deck_id;
  end if;

  insert into public.user_deck_cards(deck_id,card_name,scryfall_id,oracle_id,quantity,section)
  select
    v_deck_id,
    trim(card->>'card_name'),
    nullif(trim(card->>'scryfall_id'),''),
    nullif(trim(card->>'oracle_id'),''),
    (card->>'quantity')::smallint,
    card->>'section'
  from jsonb_array_elements(p_cards) as card;
  get diagnostics v_inserted = row_count;

  if v_inserted < 1 or not exists (
    select 1 from public.user_deck_cards where deck_id=v_deck_id and section='main'
  ) then
    raise exception 'Decklist must contain at least one main-deck card.';
  end if;

  return v_deck_id;
end;
$$;

create or replace function public.register_with_saved_deck(
  p_tournament_id uuid,
  p_user_deck_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_uid uuid := (select auth.uid());
  v_saved public.user_decks%rowtype;
  v_decklist_id uuid;
begin
  if v_uid is null then raise exception 'Sign in to register.'; end if;

  select * into v_saved
  from public.user_decks
  where id=p_user_deck_id and user_id=v_uid;
  if not found then raise exception 'Saved deck not found.'; end if;

  if not exists (
    select 1 from public.user_deck_cards
    where deck_id=p_user_deck_id and section='main'
  ) then
    raise exception 'Saved deck has no main-deck cards.';
  end if;

  insert into public.decklists(tournament_id,user_id,name)
  values(p_tournament_id,v_uid,v_saved.name)
  returning id into v_decklist_id;

  insert into public.decklist_cards(decklist_id,card_name,scryfall_id,oracle_id,quantity,section)
  select v_decklist_id,card_name,scryfall_id,oracle_id,quantity,section
  from public.user_deck_cards
  where deck_id=p_user_deck_id;

  insert into public.tournament_players(tournament_id,user_id,decklist_id)
  values(p_tournament_id,v_uid,v_decklist_id);

  return v_decklist_id;
end;
$$;

revoke execute on function public.save_user_deck(uuid,text,text,jsonb) from public, anon;
revoke execute on function public.register_with_saved_deck(uuid,uuid) from public, anon;
grant execute on function public.save_user_deck(uuid,text,text,jsonb) to authenticated;
grant execute on function public.register_with_saved_deck(uuid,uuid) to authenticated;
