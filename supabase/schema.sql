-- Shared Memory Jar: two-user backend schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists pgcrypto;

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Partner',
  current_timezone text not null,
  repair_balance int not null default 3,
  last_refilled_yyyymm text,
  -- Each user's own star color (a display preference, not core jar-core-logic
  -- domain state), picked from the app's fixed doodle palette.
  star_color text not null default '#FFC94A',
  -- Mirrors auth.users.email so a partner's identity can be shown in the "my
  -- jars" list (e.g. "jar with alice@example.com") without needing admin API
  -- access to auth.users. Backfilled opportunistically on sign-in for
  -- profiles that predate this column.
  email text,
  created_at timestamptz not null default now()
);

create table public.jars (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  user_a_id uuid not null references auth.users (id),
  user_b_id uuid references auth.users (id),
  created_at_utc timestamptz not null default now(),
  -- Countdown mode only for now (Mode B / count-up is not wired up in the app).
  mode text not null default 'countdown',
  estimated_days_apart int,
  -- Countdown mode: capacity and star size are fixed once at jar creation
  -- from the target date, and never recalculated — see jar-core-logic's
  -- starSizing.ts / computeCountdownCapacity.
  target_date_utc timestamptz,
  star_capacity_n int,
  star_size_fixed numeric
);

create table public.streaks (
  jar_id uuid primary key references public.jars (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_updated_cycle_index int not null default -1,
  -- Stars each user has personally dropped, ever — incremented the moment
  -- that user taps, independent of whether their partner ever completes the
  -- cycle. Rendered in the jar in that user's own chosen star_color.
  star_count_a int not null default 0,
  star_count_b int not null default 0
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
-- The app also reads the partner's profile (their repair balance, etc.) once
-- paired — without this, that read is silently empty and the whole state
-- fetch fails with "Cannot coerce the result to a single JSON object".
create policy "select partner profile" on public.user_profiles for select using (
  exists (
    select 1 from public.jars j
    where (j.user_a_id = auth.uid() and j.user_b_id = user_profiles.id)
       or (j.user_b_id = auth.uid() and j.user_a_id = user_profiles.id)
  )
);

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

  insert into public.streaks (jar_id, current_streak, longest_streak, last_updated_cycle_index, star_count_a, star_count_b)
    values (target_jar_id, 0, 0, -1, 0, 0);

  insert into public.cycles (jar_id, cycle_index, cycle_start_utc, cycle_end_utc, status, streak_before_cycle)
    values (target_jar_id, 0, jar_created_at, jar_created_at + interval '24 hours', 'open', 0);

  return target_jar_id;
end;
$$;

-- Lets an account detach from one specific jar (accounts can belong to
-- several at once — see the "my jars" list). A jar always has exactly two
-- members in this data model (Jar.userAId/userBId are both required,
-- non-optional), so there's no clean "half jar" state to leave behind —
-- leaving deletes that whole jar (cycles/streaks cascade-delete via their
-- FK), for both members, not just the caller. Scoped to target_jar_id, not
-- "all of my jars", precisely because there can now be more than one.
-- Privileged for the same reason join_jar_by_code is: this needs to touch a
-- jar row via a condition ("my own membership") that a plain per-row RLS
-- policy can't express as a scoped, safe delete grant.
create or replace function public.leave_jar(target_jar_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.jars
    where id = target_jar_id
      and (user_a_id = auth.uid() or user_b_id = auth.uid());
end;
$$;

-- Enable Realtime updates for live sync between the two partners' devices.
alter publication supabase_realtime add table public.cycles;
alter publication supabase_realtime add table public.streaks;
alter publication supabase_realtime add table public.jars;

-- Migration: safe to re-run against a database that already had the original
-- schema (countup-only, single completed_star_count) applied. Adds the
-- countdown-mode + per-user star-drop columns without touching existing rows.
-- The old completed_star_count column is left in place, unused, rather than
-- dropped.
alter table public.user_profiles add column if not exists star_color text not null default '#FFC94A';
alter table public.user_profiles add column if not exists email text;
alter table public.jars add column if not exists target_date_utc timestamptz;
alter table public.jars add column if not exists star_capacity_n int;
alter table public.jars add column if not exists star_size_fixed numeric;
alter table public.streaks add column if not exists star_count_a int not null default 0;
alter table public.streaks add column if not exists star_count_b int not null default 0;
