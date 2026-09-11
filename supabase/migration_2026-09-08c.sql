-- Fixes "Database error deleting user": jars.user_a_id / user_b_id had no
-- delete behavior, so deleting an auth user who'd ever created or joined a
-- jar failed with a foreign-key violation. This makes it cascade instead —
-- deleting either member's account deletes that jar (and, via the existing
-- cascades on streaks/cycles, everything under it).

alter table public.jars drop constraint if exists jars_user_a_id_fkey;
alter table public.jars add constraint jars_user_a_id_fkey foreign key (user_a_id) references auth.users (id) on delete cascade;

alter table public.jars drop constraint if exists jars_user_b_id_fkey;
alter table public.jars add constraint jars_user_b_id_fkey foreign key (user_b_id) references auth.users (id) on delete cascade;
