-- Run this once in the Supabase SQL Editor. Safe to re-run.
-- Moves star color from a per-account setting to a per-jar choice, locked in
-- at create/join time (each side picks their own color for that jar and
-- can't change it afterward — see schema.sql for why).

alter table public.jars add column if not exists user_a_star_color text not null default '#FFC94A';
alter table public.jars add column if not exists user_b_star_color text;

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

  insert into public.streaks (jar_id, current_streak, longest_streak, last_updated_cycle_index, star_count_a, star_count_b)
    values (target_jar_id, 0, 0, -1, 0, 0);

  insert into public.cycles (jar_id, cycle_index, cycle_start_utc, cycle_end_utc, status, streak_before_cycle)
    values (target_jar_id, 0, joined_at, joined_at + interval '24 hours', 'open', 0);

  return target_jar_id;
end;
$$;
