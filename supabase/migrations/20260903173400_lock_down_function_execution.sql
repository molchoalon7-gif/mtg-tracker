revoke execute on function public.start_tournament(uuid) from public, anon;
revoke execute on function public.finish_tournament(uuid) from public, anon;
revoke execute on function public.cancel_tournament(uuid) from public, anon;
grant execute on function public.start_tournament(uuid) to authenticated;
grant execute on function public.finish_tournament(uuid) to authenticated;
grant execute on function public.cancel_tournament(uuid) to authenticated;

revoke execute on function public.is_tournament_admin(uuid) from public;
grant execute on function public.is_tournament_admin(uuid) to anon, authenticated;

revoke execute on function public.enforce_tournament_registration() from public, anon, authenticated;
