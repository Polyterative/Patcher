-- Scope module row updates to authenticated users only, keeping community
-- editing available for any logged-in user (app already gates edit UI/flows
-- behind an authenticated session).
drop policy if exists "update possible" on public.modules;
create policy "modules_update_authenticated" on public.modules
  for update to authenticated
  using (true)
  with check (true);
