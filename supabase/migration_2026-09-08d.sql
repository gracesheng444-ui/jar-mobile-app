-- Adds a self-service "delete my account" RPC — lets a signed-in user
-- permanently delete their own account from the app itself, with no
-- admin/service-role key involved. Deleting the auth.users row cascades to
-- user_profiles, and to any jars they're in (and that jar's streaks/cycles),
-- via existing FKs (including the cascade fix from migration_2026-09-08c).

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
