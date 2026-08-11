-- Wrap per-row auth.uid()/auth.jwt() calls in scalar subselects so Postgres
-- evaluates them once per statement (InitPlan) instead of once per row.
-- Flagged by the Supabase performance advisor (auth_rls_initplan).
-- Expressions are otherwise identical to the previous definitions.

-- comments --------------------------------------------------------------------
alter policy "Users can delete own comments" on public.comments
  using ((select auth.uid()) = "authorId");

-- module_flags ----------------------------------------------------------------
alter policy "users can insert their own flags" on public.module_flags
  with check (user_id = (select auth.uid()));
alter policy "users can view their own flags" on public.module_flags
  using (user_id = (select auth.uid()));
alter policy "admins can view all flags" on public.module_flags
  using ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');
alter policy "admins can update flags" on public.module_flags
  using ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');
alter policy "admins can delete flags" on public.module_flags
  using ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');

-- modules ---------------------------------------------------------------------
alter policy "admins can delete any module" on public.modules
  using ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');

-- patches ---------------------------------------------------------------------
alter policy "Public patches or own patches are visible" on public.patches
  using (public = true or (select auth.uid()) = authorid);
alter policy "Users can delete own" on public.patches
  using ((select auth.uid()) = authorid);
alter policy "Users can insert their own." on public.patches
  with check ((select auth.uid()) = authorid);
alter policy "Users can update own." on public.patches
  using ((select auth.uid()) = authorid);

-- patch_connections -------------------------------------------------------------
alter policy "Connections visible if patch is public or owned" on public.patch_connections
  using (patchid in (
    select id from public.patches
    where public = true or authorid = (select auth.uid())));

-- profiles ----------------------------------------------------------------------
alter policy "Users can insert their own profile." on public.profiles
  with check ((select auth.uid()) = id);
alter policy "profiles_update_own" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- racks ---------------------------------------------------------------------------
alter policy "Enable access to for public or own" on public.racks
  using (public = true or (select auth.uid()) = authorid);
alter policy "Users can insert their own." on public.racks
  with check ((select auth.uid()) = authorid);
alter policy "Users can update own" on public.racks
  using ((select auth.uid()) = authorid);
alter policy "Admins can update any rack" on public.racks
  using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin')
  with check (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin');

-- rack_modules ----------------------------------------------------------------------
alter policy "Rack modules visible if rack is public or owned" on public.rack_modules
  using (rackid in (
    select id from public.racks
    where public = true or authorid = (select auth.uid())));

-- user_module_tags ---------------------------------------------------------------------
alter policy "user_module_tags owner insert" on public.user_module_tags
  with check ((select auth.uid()) = authorid);
alter policy "user_module_tags owner delete" on public.user_module_tags
  using ((select auth.uid()) = authorid);

-- user_modules ---------------------------------------------------------------------------
alter policy "user_modules owner insert" on public.user_modules
  with check ((select auth.uid()) = profileid);
alter policy "user_modules owner update" on public.user_modules
  using ((select auth.uid()) = profileid)
  with check ((select auth.uid()) = profileid);
alter policy "user_modules owner delete" on public.user_modules
  using ((select auth.uid()) = profileid);

-- api_keys ----------------------------------------------------------------------------------
alter policy "api_keys_select_own" on public.api_keys
  using (profile_id = (select auth.uid()));
alter policy "api_keys_select_admin" on public.api_keys
  using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin');

-- api_key_usage_monthly ------------------------------------------------------------------------
alter policy "api_key_usage_monthly_select_own" on public.api_key_usage_monthly
  using (exists (
    select 1 from public.api_keys k
    where k.id = api_key_usage_monthly.key_id and k.profile_id = (select auth.uid())));
alter policy "api_key_usage_monthly_select_admin" on public.api_key_usage_monthly
  using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin');
