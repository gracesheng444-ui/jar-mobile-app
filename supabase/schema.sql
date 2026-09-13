-- Shared Memory Jar: two-user backend schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists pgcrypto;

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Partner',
  current_timezone text not null,
  repair_balance int not null default 3,
  last_refilled_yyyymm text,
  -- When this user last spent a repair pass, shown in the app next to their remaining balance.
  -- Null until their first repair.
  last_repair_used_at_utc timestamptz,
  -- Each user's own star color (a display preference, not core jar-core-logic
  -- domain state), picked from the app's fixed doodle palette.
  star_color text not null default '#FFC94A',
  -- Mirrors auth.users.email so a partner's identity can be shown in the "my
  -- jars" list (e.g. "jar with alice@example.com") without needing admin API
  -- access to auth.users. Backfilled opportunistically on sign-in for
  -- profiles that predate this column.
  email text,
  -- UI language ('en' | 'zh'), synced across devices via this profile row.
  -- Seeded from the device's locally-detected preference on first sign-in.
  language text not null default 'en',
  -- Profile picture: either a photo the user picked (avatar_url, stored in the
  -- "avatars" storage bucket below) or a fallback solid color rendered as an
  -- initial-letter circle when there's no photo. avatar_color always has a
  -- value (seeded on profile creation); avatar_url is null until they upload one.
  avatar_url text,
  avatar_color text not null default '#FFC94A',
  -- This device's Expo push token, so the notify-partner-tap Edge Function can push to it. Only
  -- ever the most recently registered device — a user with two devices gets pushes on whichever
  -- one last opened the app, not both; null until notification permission is granted.
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table public.jars (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid references auth.users (id) on delete cascade,
  created_at_utc timestamptz not null default now(),
  -- Countdown mode only for now (Mode B / count-up is not wired up in the app).
  mode text not null default 'countdown',
  estimated_days_apart int,
  -- Countdown mode: capacity and star size are fixed once at jar creation
  -- from the target date, and never recalculated — see jar-core-logic's
  -- starSizing.ts / computeCountdownCapacity.
  target_date_utc timestamptz,
  star_capacity_n int,
  star_size_fixed numeric,
  -- Each side's star color, chosen once — the creator at creation, the joiner
  -- at join — and locked for this jar's lifetime: a jar-scoped choice, not an
  -- account-wide preference, so the same person can use a different color in
  -- a different jar. There is deliberately no RLS update policy on this
  -- table for regular clients (only the security-definer RPCs below can
  -- write to a jar row at all, and neither of them exposes a way to change
  -- these after the fact), so immutability is enforced by omission rather
  -- than a check constraint.
  user_a_star_color text not null default '#FFC94A',
  user_b_star_color text
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
  -- Optional short memory either partner can attach to this day, independent of whether they
  -- tapped. Writable via the existing "update cycles of own jar" RLS policy, no RPC needed.
  user_a_note text,
  user_b_note text,
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

-- Lets the app show/compute against a jar's target date *before* actually
-- joining it (join_jar_by_code requires the joining user to not be a member
-- yet, so they can't SELECT the row directly under "select own jar" — same
-- reason join_jar_by_code itself has to be privileged). Scoped to only
-- still-open jars, so it can't be used to peek at target dates for jars
-- that have already started.
create or replace function public.get_target_date_by_code(code text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  result timestamptz;
begin
  select target_date_utc into result from public.jars
    where invite_code = code and user_b_id is null;
  if result is null then
    raise exception 'Invalid or already-used invite code';
  end if;
  return result;
end;
$$;

-- Joining by invite code has to run as a privileged function: the joining user
-- isn't a jar member yet, so the "select own jar" policy above can't let them
-- look the row up by code directly.
-- The jar's first cycle is created here, anchored to *this* moment (the
-- join) rather than the jar's original created_at_utc — a jar can sit
-- "waiting for partner" for any length of time, and the daily cycle
-- shouldn't have been silently ticking during that wait. created_at_utc
-- itself is updated to match, since jar-core-logic's cycle math (and this
-- app's own sort-by-recency jar list) treats it as the single anchor for
-- every subsequent cycle's boundaries — a jar with no partner yet still has
-- no cycle/streak rows either way, so "waiting for partner" stays just
-- "this jar has no cycle", not a special-cased status.
-- Capacity is computed *here*, from the target date and this same join
-- moment, for the same reason: it must match however long the countdown
-- actually turns out to run, not however long was left when the jar was
-- first created. The formula is the one-line "2x remaining days" from
-- jar-core-logic's computeCountdownCapacity, safe to mirror in SQL; the
-- star *size* formula is more involved and has changed repeatedly this
-- project, so re-implementing it here too would just be a second copy to
-- keep in sync — the caller computes that one (from this same target date)
-- and passes it in instead.
-- Signature changed (added p_star_size_fixed, then p_star_color) from the
-- version(s) originally deployed — Postgres treats a different argument list
-- as a different function, so "create or replace" alone would leave old
-- overloads sitting around unused rather than actually replacing them. Drop
-- them explicitly.
drop function if exists public.join_jar_by_code(text);
drop function if exists public.join_jar_by_code(text, numeric);
create or replace function public.join_jar_by_code(code text, p_star_size_fixed numeric, p_star_color text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_jar_id uuid;
  joined_at timestamptz := now();
  target_date timestamptz;
  computed_capacity int;
begin
  select id, target_date_utc into target_jar_id, target_date from public.jars
    where invite_code = code and user_b_id is null
    for update;

  if target_jar_id is null then
    raise exception 'Invalid or already-used invite code';
  end if;

  if (select user_a_id from public.jars where id = target_jar_id) = auth.uid() then
    raise exception 'You cannot join your own jar';
  end if;

  computed_capacity := 2 * greatest(1, ceil(extract(epoch from (target_date - joined_at)) / 86400));

  update public.jars
    set user_b_id = auth.uid(),
        created_at_utc = joined_at,
        star_capacity_n = computed_capacity,
        star_size_fixed = p_star_size_fixed,
        user_b_star_color = p_star_color
    where id = target_jar_id;

  -- A jar with user_b_id still null "should" never have streaks/cycles rows yet, since those are
  -- only ever created right here. But this jar's id is reused from whatever row matched the
  -- invite code above, so if one was ever left behind (e.g. a partner un-paired and re-paired via
  -- manual cleanup instead of leave_jar(), which cascade-deletes the whole jars row), clear it
  -- first rather than letting a leftover row 500 the join with a raw unique-constraint error.
  delete from public.streaks where jar_id = target_jar_id;
  delete from public.cycles where jar_id = target_jar_id;

  insert into public.streaks (jar_id, current_streak, longest_streak, last_updated_cycle_index, star_count_a, star_count_b)
    values (target_jar_id, 0, 0, -1, 0, 0);

  insert into public.cycles (jar_id, cycle_index, cycle_start_utc, cycle_end_utc, status, streak_before_cycle)
    values (target_jar_id, 0, joined_at, joined_at + interval '24 hours', 'open', 0);

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

-- Lets a signed-in user permanently delete their own account, from the app
-- itself, with no admin/service-role key involved. Deleting the auth.users
-- row cascades to user_profiles, and to any jars they're in (and, from
-- there, that jar's streaks/cycles) via the FKs above. security definer is
-- required here since a client-side RLS policy has no way to grant delete
-- access to auth.users at all; scoping to auth.uid() keeps it to "my own
-- account only".
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Lets either partner change a jar's meet-up date after creation. There's no RLS update policy
-- on public.jars at all, so this needs the same security-definer treatment as join_jar_by_code
-- / leave_jar. Recomputes star_capacity_n/star_size_fixed from the new date (same "2x remaining
-- days" formula as join_jar_by_code, mirrored here for the same reason) — the visible effect is
-- every star already in the jar, and every star still to come, resizes to fit the new countdown.
-- p_star_size_fixed is computed client-side and passed in, same split as join_jar_by_code: the
-- capacity formula is a one-liner safe to duplicate in SQL, the size formula is more involved and
-- has changed repeatedly, so re-implementing it here too would just be a second copy to keep in
-- sync. Signature changed (added p_star_size_fixed) from the version originally deployed —
-- Postgres treats a different argument list as a different function, so drop the old one first.
drop function if exists public.update_target_date(uuid, timestamptz);
create or replace function public.update_target_date(target_jar_id uuid, new_target_date timestamptz, p_star_size_fixed numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  computed_capacity int;
begin
  computed_capacity := 2 * greatest(1, ceil(extract(epoch from (new_target_date - now())) / 86400));

  update public.jars
    set target_date_utc = new_target_date,
        star_capacity_n = computed_capacity,
        star_size_fixed = p_star_size_fixed
    where id = target_jar_id and (user_a_id = auth.uid() or user_b_id = auth.uid());
end;
$$;

-- Enable Realtime updates for live sync between the two partners' devices.
alter publication supabase_realtime add table public.cycles;
alter publication supabase_realtime add table public.streaks;
alter publication supabase_realtime add table public.jars;

-- Profile picture storage: one file per user at "<user_id>/avatar.<ext>",
-- always upserted (overwritten) on re-upload rather than accumulating old
-- versions. Public read (profile pictures are shown to a partner who isn't
-- necessarily authenticated as that exact row's owner), but only the owning
-- user can write into their own folder.
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatar photos are publicly readable" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "users can upload their own avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users can replace their own avatar" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users can delete their own avatar" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Migration: safe to re-run against a database that already had the original
-- schema (countup-only, single completed_star_count) applied. Adds the
-- countdown-mode + per-user star-drop columns without touching existing rows.
-- The old completed_star_count column is left in place, unused, rather than
-- dropped.
alter table public.user_profiles add column if not exists star_color text not null default '#FFC94A';
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists language text not null default 'en';
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists avatar_color text not null default '#FFC94A';
alter table public.jars add column if not exists target_date_utc timestamptz;
alter table public.jars add column if not exists star_capacity_n int;
alter table public.jars add column if not exists star_size_fixed numeric;
alter table public.jars add column if not exists user_a_star_color text not null default '#FFC94A';
alter table public.jars add column if not exists user_b_star_color text;
alter table public.streaks add column if not exists star_count_a int not null default 0;
alter table public.streaks add column if not exists star_count_b int not null default 0;

-- jars.user_a_id / user_b_id originally had no delete behavior, so deleting an
-- auth user who'd ever created or joined a jar failed with a foreign-key
-- violation ("Database error deleting user"). Cascading here means deleting
-- either member's account deletes that jar (and, via the existing cascades on
-- streaks/cycles, everything under it) rather than leaving an orphaned half-jar.
alter table public.jars drop constraint if exists jars_user_a_id_fkey;
alter table public.jars add constraint jars_user_a_id_fkey foreign key (user_a_id) references auth.users (id) on delete cascade;
alter table public.jars drop constraint if exists jars_user_b_id_fkey;
alter table public.jars add constraint jars_user_b_id_fkey foreign key (user_b_id) references auth.users (id) on delete cascade;

alter table public.cycles add column if not exists user_a_note text;
alter table public.cycles add column if not exists user_b_note text;
