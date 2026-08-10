-- Stop leaking private-patch module layouts: patch_module_instances select is
-- now scoped to instances of public patches, or patches owned by the caller.
drop policy if exists "Allow everybody to select" on public.patch_module_instances;
create policy "patch_module_instances_select_public_or_own" on public.patch_module_instances
  for select using (patch_id in (
    select id from public.patches
    where public = true or authorid = (select auth.uid())));
