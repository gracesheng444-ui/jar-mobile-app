-- Memory notes: a short optional note either partner can attach to any day's cycle. Writable
-- directly by regular clients — the existing "update cycles of own jar" RLS policy already
-- covers this (jar membership only, no cycle_index restriction), no RPC needed.
alter table public.cycles add column if not exists user_a_note text;
alter table public.cycles add column if not exists user_b_note text;

-- Lets either partner change a jar's meet-up date after creation. There's no RLS update policy
-- on public.jars at all (see schema.sql), so this needs the same security-definer treatment as
-- join_jar_by_code/leave_jar. Deliberately does NOT recompute star_capacity_n/star_size_fixed —
-- those stay fixed once set, so existing stars don't jump in size; only the countdown itself
-- (the display, and how far out you can push it) changes.
create or replace function public.update_target_date(target_jar_id uuid, new_target_date timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jars
    set target_date_utc = new_target_date
    where id = target_jar_id and (user_a_id = auth.uid() or user_b_id = auth.uid());
end;
$$;
