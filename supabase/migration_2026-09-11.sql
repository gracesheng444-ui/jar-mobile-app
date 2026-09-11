-- update_target_date now recomputes star_capacity_n/star_size_fixed from the new date, instead
-- of leaving them fixed — every star already in the jar, and every star still to come, resizes
-- to fit the new countdown. Same "2x remaining days" capacity formula as join_jar_by_code,
-- mirrored here for the same reason (see schema.sql); star size is computed client-side and
-- passed in, since that formula is more involved and has changed repeatedly. Signature changed
-- (added p_star_size_fixed), so drop the old one first — Postgres treats a different argument
-- list as a different function.
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
