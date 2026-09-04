create or replace function public.cleanup_signup_attempts()
returns void
language sql
security invoker
set search_path=''
as $$
  delete from public.signup_attempts where created_at < now() - interval '24 hours';
$$;

revoke all on function public.cleanup_signup_attempts() from public, anon, authenticated;
