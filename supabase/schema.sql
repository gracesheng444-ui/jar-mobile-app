-- Shared Memory Jar: two-user backend schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists pgcrypto;

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Partner',
  current_timezone text not null,
  repair_balance int not null default 3,
  last_refilled_yyyymm text,
  created_at timestamptz not null default now()
);

create table public.jars (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  user_a_id uuid not null references auth.users (id),
  user_b_id uuid references auth.users (id),
  created_at_utc timestamptz not null default now(),
  mode text not null default 'countup',
  estimated_days_apart int
);

create table public.streaks (
  jar_id uuid primary key references public.jars (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_updated_cycle_index int not null default -1,
  completed_star_count int not null default 0
);

create table public.cycles (
  jar_id uuid not null references public.jars (id) on delete cascade,
  cycle_index int not null,
  cycle_start_utc timestamptz not null,
  cycle_end_utc timestamptz not null,
  user_a_tapped boolean not null default false,
  user_b_tapped boolean not null default false,
  status text not null default 'open',
  grace_expires_at_utc timestamptz,
  repaired_by uuid[] not null default '{}',
  streak_before_cycle int not null default 0,
  primary key (jar_id, cycle_index)
);

alter table public.user_profiles enable row level security;
alter table public.jars enable row level security;
alter table public.streaks enable row level security;
alter table public.cycles enable row level security;

create policy "select own profile" on public.user_profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.user_profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.user_profiles for update using (auth.uid() = id);

create policy "select own jar" on public.jars for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);
create policy "insert own jar" on public.jars for insert
  with check (auth.uid() = user_a_id);

create policy "select cycles of own jar" on public.cycles for select using (
  exists (select 1 from public.jars j where j.id = cycles.jar_id and (j.user_a_id = auth.uid() or j.user_b_id = auth.uid()))
);
create policy "insert cycles of own jar" on public.cycles for insert with check (
  exists (select 1 from public.jars j where j.id = cycles.jar_id and (j.user_a_id = auth.uid() or j.user_b_id = auth.uid()))
);
create policy "update cycles of own jar" on public.cycles for update using (
  exists (select 1 from public.jars j where j.id = cycles.jar_id and (j.user_a_id = auth.uid() or j.user_b_id = auth.uid()))
);

create policy "select streaks of own jar" on public.streaks for select using (
  exists (select 1 from public.jars j where j.id = streaks.jar_id and (j.user_a_id = auth.uid() or j.user_b_id = auth.uid()))
);
create policy "insert streaks of own jar" on public.streaks for insert with check (
  exists (select 1 from public.jars j where j.id = streaks.jar_id and (j.user_a_id = auth.uid() or j.user_b_id = auth.uid()))
);
create policy "update streaks of own jar" on public.streaks for update using (
  exists (select 1 from public.jars j where j.id = streaks.jar_id and (j.user_a_id = auth.uid() or j.user_b_id = auth.uid()))
);

-- Joining by invite code has to run as a privileged function: the joining user
-- isn't a jar member yet, so the "select own jar" policy above can't let them
-- look the row up by code directly.
-- The jar's first cycle is created here (anchored to the jar's original
-- created_at_utc, not the join moment) rather than at jar-creation time, so a
-- jar with no partner yet has no cycle/streak rows — "waiting for partner" is
-- just "this jar has no cycle", not a special-cased status.
create or replace function public.join_jar_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_jar_id uuid;
  jar_created_at timestamptz;
begin
  select id, created_at_utc into target_jar_id, jar_created_at from public.jars
    where invite_code = code and user_b_id is null
    for update;

  if target_jar_id is null then
    raise exception 'Invalid or already-used invite code';
  end if;

  if (select user_a_id from public.jars where id = target_jar_id) = auth.uid() then
    raise exception 'You cannot join your own jar';
  end if;

  update public.jars set user_b_id = auth.uid() where id = target_jar_id;

  insert into public.streaks (jar_id, current_streak, longest_streak, last_updated_cycle_index, completed_star_count)
    values (target_jar_id, 0, 0, -1, 0);

  insert into public.cycles (jar_id, cycle_index, cycle_start_utc, cycle_end_utc, status, streak_before_cycle)
    values (target_jar_id, 0, jar_created_at, jar_created_at + interval '24 hours', 'open', 0);

  return target_jar_id;
end;
$$;

-- Enable Realtime updates for live sync between the two partners' devices.
alter publication supabase_realtime add table public.cycles;
alter publication supabase_realtime add table public.streaks;
alter publication supabase_realtime add table public.jars;
