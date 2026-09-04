alter table public.user_decks alter column format drop not null;
alter table public.user_decks alter column format drop default;
alter table public.user_decks drop constraint if exists user_decks_format_check;
alter table public.user_decks add constraint user_decks_format_check check (format is null or char_length(format) between 1 and 40);

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
  v_format text := nullif(trim(coalesce(p_format,'')), '');
begin
  if v_uid is null then
    raise exception 'Sign in to save a deck.';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 80 then
    raise exception 'Deck name must be between 1 and 80 characters.';
  end if;
  if v_format is not null and char_length(v_format) > 40 then
    raise exception 'Format must be 40 characters or fewer.';
  end if;
  if p_cards is null or jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    raise exception 'Decklist must contain at least one card.';
  end if;

  if p_deck_id is null then
    insert into public.user_decks(user_id,name,format)
    values(v_uid,trim(p_name),v_format)
    returning id into v_deck_id;
  else
    update public.user_decks
      set name=trim(p_name), format=v_format, updated_at=now()
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
