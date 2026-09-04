create table if not exists public.signup_attempts (
  id bigserial primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.signup_attempts enable row level security;
revoke all on table public.signup_attempts from anon, authenticated;
create index if not exists signup_attempts_ip_created_idx on public.signup_attempts(ip_hash, created_at desc);
