-- MPress Ledger schema. Paste into Supabase → SQL Editor → Run.
-- 1) Replace the two emails below with yours before running.

create table if not exists public.allowed_users (
  email text primary key
);
insert into public.allowed_users (email) values
  ('you@example.com'),
  ('teammate@example.com')
on conflict do nothing;

create table if not exists public.transactions (
  id uuid primary key,
  type text not null check (type in ('income','expense')),
  date date not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  currency text not null check (currency in ('USD','PHP')),
  rate numeric not null,
  gross numeric not null,
  fee numeric not null default 0,
  net numeric not null,
  party text not null,
  channel text,
  note text,
  splits jsonb not null default '[]'
);

-- One shared settings row for the whole team
create table if not exists public.team_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);
insert into public.team_settings (id) values (1) on conflict do nothing;

-- Only the emails in allowed_users can read or write anything
create or replace function public.is_team_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

alter table public.allowed_users enable row level security;
alter table public.transactions enable row level security;
alter table public.team_settings enable row level security;

create policy "team reads transactions" on public.transactions
  for select to authenticated using (public.is_team_member());
create policy "team writes transactions" on public.transactions
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());

create policy "team reads settings" on public.team_settings
  for select to authenticated using (public.is_team_member());
create policy "team writes settings" on public.team_settings
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- allowed_users has no policies on purpose: nobody can read or edit it from the app.

-- Live updates between the two of you
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.team_settings;
