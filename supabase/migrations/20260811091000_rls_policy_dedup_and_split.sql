-- Consolidate duplicate permissive policies flagged by the performance advisor
-- (multiple_permissive_policies). Access semantics are unchanged:
--   * profiles: "Public profiles are viewable by everyone." (using true) already
--     covers profiles_select_own (using true); profiles_update_own supersedes the
--     older "Users can update own profile." and adds the missing WITH CHECK.
--   * FOR ALL owner policies on patch_module_instances / rack_modules /
--     patch_connections / module_collection_entries duplicated the dedicated
--     SELECT policies ("public or own" is a superset of "own"). They are split
--     into write-only policies; reads keep flowing through the SELECT policies.
--     Writes were only ever effective for authenticated owners (auth.uid() is
--     null for anon), so restricting the new policies to authenticated is a
--     no-op in practice.

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

-- patch_module_instances ----------------------------------------------------
drop policy if exists "Users can manage their own patch instances" on public.patch_module_instances;
create policy "patch_module_instances_insert_own" on public.patch_module_instances
  for insert to authenticated
  with check (patch_id in (select id from public.patches where authorid = (select auth.uid())));
create policy "patch_module_instances_update_own" on public.patch_module_instances
  for update to authenticated
  using (patch_id in (select id from public.patches where authorid = (select auth.uid())))
  with check (patch_id in (select id from public.patches where authorid = (select auth.uid())));
create policy "patch_module_instances_delete_own" on public.patch_module_instances
  for delete to authenticated
  using (patch_id in (select id from public.patches where authorid = (select auth.uid())));

-- patch_connections ---------------------------------------------------------
drop policy if exists "Only patch owner can modify connections" on public.patch_connections;
create policy "patch_connections_insert_own" on public.patch_connections
  for insert to authenticated
  with check (patchid in (select id from public.patches where authorid = (select auth.uid())));
create policy "patch_connections_update_own" on public.patch_connections
  for update to authenticated
  using (patchid in (select id from public.patches where authorid = (select auth.uid())))
  with check (patchid in (select id from public.patches where authorid = (select auth.uid())));
create policy "patch_connections_delete_own" on public.patch_connections
  for delete to authenticated
  using (patchid in (select id from public.patches where authorid = (select auth.uid())));

-- rack_modules ---------------------------------------------------------------
drop policy if exists "Only rack owner can modify rack modules" on public.rack_modules;
create policy "rack_modules_insert_own" on public.rack_modules
  for insert to authenticated
  with check (rackid in (select id from public.racks where authorid = (select auth.uid())));
create policy "rack_modules_update_own" on public.rack_modules
  for update to authenticated
  using (rackid in (select id from public.racks where authorid = (select auth.uid())))
  with check (rackid in (select id from public.racks where authorid = (select auth.uid())));
create policy "rack_modules_delete_own" on public.rack_modules
  for delete to authenticated
  using (rackid in (select id from public.racks where authorid = (select auth.uid())));

-- module_collection_entries ---------------------------------------------------
drop policy if exists "module_collection_entries_write_via_parent" on public.module_collection_entries;
create policy "module_collection_entries_insert_via_parent" on public.module_collection_entries
  for insert to authenticated
  with check (exists (
    select 1 from public.module_collections c
    where c.id = collection_id and (select auth.uid()) = c.authorid));
create policy "module_collection_entries_update_via_parent" on public.module_collection_entries
  for update to authenticated
  using (exists (
    select 1 from public.module_collections c
    where c.id = collection_id and (select auth.uid()) = c.authorid))
  with check (exists (
    select 1 from public.module_collections c
    where c.id = collection_id and (select auth.uid()) = c.authorid));
create policy "module_collection_entries_delete_via_parent" on public.module_collection_entries
  for delete to authenticated
  using (exists (
    select 1 from public.module_collections c
    where c.id = collection_id and (select auth.uid()) = c.authorid));
