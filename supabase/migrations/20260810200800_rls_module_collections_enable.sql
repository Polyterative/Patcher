-- Enable RLS on module_collections and module_collection_entries. Public
-- collections and their entries remain readable by anyone; write access is
-- limited to the collection's own author (module_collection_entries follows
-- the parent collection's ownership).
alter table public.module_collections enable row level security;
create policy "module_collections_select_public_or_own" on public.module_collections
  for select using (public = true or (select auth.uid()) = authorid);
create policy "module_collections_insert_own" on public.module_collections
  for insert to authenticated with check ((select auth.uid()) = authorid);
create policy "module_collections_update_own" on public.module_collections
  for update to authenticated
  using ((select auth.uid()) = authorid)
  with check ((select auth.uid()) = authorid);
create policy "module_collections_delete_own" on public.module_collections
  for delete to authenticated using ((select auth.uid()) = authorid);

alter table public.module_collection_entries enable row level security;
create policy "module_collection_entries_select_via_parent" on public.module_collection_entries
  for select using (exists (
    select 1 from public.module_collections c
    where c.id = collection_id
      and (c.public = true or (select auth.uid()) = c.authorid)));
create policy "module_collection_entries_write_via_parent" on public.module_collection_entries
  for all to authenticated
  using (exists (
    select 1 from public.module_collections c
    where c.id = collection_id and (select auth.uid()) = c.authorid))
  with check (exists (
    select 1 from public.module_collections c
    where c.id = collection_id and (select auth.uid()) = c.authorid));

-- Companion policy: account deletion removes a user's module_collection_entries
-- across all collections (see deleteModuleCollectionEntriesByModule in
-- supabase-delete-account-reset.ts). module_id's FK is NO ACTION, so module
-- owners must be able to delete entries referencing their own modules even in
-- collections they don't own.
create policy "module_collection_entries_delete_by_module_owner" on public.module_collection_entries
  for delete to authenticated using (exists (
    select 1 from public.modules m
    where m.id = module_id and m.submitter = (select auth.uid())));
