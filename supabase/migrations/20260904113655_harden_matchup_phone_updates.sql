drop policy if exists user_contacts_self_update on public.user_contacts;
create policy user_contacts_self_update
on public.user_contacts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke update on public.user_contacts from authenticated;
grant update(phone) on public.user_contacts to authenticated;

drop function if exists public.set_contact_phone(text);

create or replace function private.touch_user_contact_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_user_contact_updated_at() from public, anon, authenticated;

drop trigger if exists touch_user_contact_updated_at on public.user_contacts;
create trigger touch_user_contact_updated_at
before update on public.user_contacts
for each row execute function private.touch_user_contact_updated_at();
