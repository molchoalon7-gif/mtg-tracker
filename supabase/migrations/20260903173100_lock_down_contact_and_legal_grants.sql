revoke all privileges on table public.user_contacts from anon, authenticated;
grant select on table public.user_contacts to authenticated;

revoke all privileges on table public.legal_acceptances from anon, authenticated;
grant select, insert on table public.legal_acceptances to authenticated;
