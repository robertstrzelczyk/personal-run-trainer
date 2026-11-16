-- Uruchom w Supabase SQL Editor (projekt własny).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  age int not null default 35 check (age between 14 and 90),
  sex text not null default 'male' check (sex in ('male', 'female')),
  max_hr int not null default 185 check (max_hr between 130 and 230),
  rest_hr int not null default 55 check (rest_hr between 30 and 100),
  goal text not null default 'fitness' check (goal in ('fitness', '5k', '10k', 'half', 'marathon')),
  days_per_week int not null default 4 check (days_per_week between 2 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.runs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  garmin_id text,
  source text not null check (source in ('fit', 'garmin', 'demo')),
  name text,
  start_time timestamptz not null,
  distance_m double precision not null,
  duration_s double precision not null,
  avg_hr double precision,
  max_hr double precision,
  avg_speed double precision not null,
  avg_cadence double precision,
  ascent_m double precision,
  decoupling_pct double precision,
  hr_hist jsonb,
  best jsonb,
  trimp double precision,
  created_at timestamptz not null default now()
);

create index if not exists runs_user_start_idx on public.runs (user_id, start_time desc);

create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  vo2max double precision not null,
  unique (user_id, date)
);

create table if not exists public.sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_synced_at timestamptz,
  last_days int
);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.sync_state enable row level security;

create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "runs_own" on public.runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_metrics_own" on public.daily_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sync_state_own" on public.sync_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  insert into public.sync_state (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
