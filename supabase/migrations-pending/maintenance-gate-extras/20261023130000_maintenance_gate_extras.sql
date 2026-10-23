-- Maintenance gate extras: closes the developer-API views and public storage buckets while the flag
-- `maintenanceModeEnabled` (environment 'production') is on. Requires the base gate (private.maint_ok()).
--
--   1. restrictive policy `maint_gate_api` for api_view_owner / api_reader on the tables the api_v1_* views read.
--      Those roles carry no JWT, so private.maint_ok() is false while the flag is on: the views return nothing.
--      Admin API keys are NOT exempted at the database level (nothing unforgeable identifies them here).
--   2. public storage buckets: originals recorded in private.maint_bucket_state; trigger on public.app_feature_flags
--      sets storage.buckets.public = false while the flag is on and restores the recorded value when it is off.
--   3. storage.objects: restrictive policy limited to the recorded buckets (admin passes via private.maint_ok())
--      plus a permissive admin select policy on those buckets (needed to create signed URLs).
--      Skipped with a WARNING when this session may not manage storage.objects / storage.buckets.
-- Rollback: rollback/20261023130000_maintenance_gate_extras.rollback.sql. Safe to re-run. No data changes.

begin;
set lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.maint_ok()') is null then
    raise exception 'maintenance gate extras: private.maint_ok() not found. Apply the base maintenance gate first.';
  end if;
end $$;

create table if not exists private.maint_extras_state (
  kind text not null check (kind in ('api_policy', 'storage_policy')),
  obj text not null,
  primary key (kind, obj)
);
revoke all on private.maint_extras_state from public, anon, authenticated;

create table if not exists private.maint_bucket_state (
  bucket_id text primary key,
  original_public boolean not null
);
revoke all on private.maint_bucket_state from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Developer API roles
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare
  t text;
  r text;
  roles text[] := array[]::text[];
begin
  foreach r in array array['api_view_owner', 'api_reader'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      roles := roles || r;
      execute format('grant usage on schema private to %I', r);
      execute format('grant execute on function private.maint_ok() to %I', r);
    end if;
  end loop;

  if cardinality(roles) = 0 then
    raise notice 'maintenance gate extras: no api roles present, API policy skipped';
    return;
  end if;

  foreach t in array array['modules','manufacturers','module_ins','module_outs','module_panels','module_tags','tags','standards'] loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'maintenance gate extras: table public.% not present, skipped', t;
      continue;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid = format('public.%I', t)::regclass) then
      raise warning 'maintenance gate extras: row level security is off on public.%; the policy cannot gate it (the worker check still applies)', t;
      continue;
    end if;
    execute format('drop policy if exists maint_gate_api on public.%I', t);
    execute format(
      'create policy maint_gate_api on public.%I as restrictive for all to %s '
      'using ((select private.maint_ok())) with check ((select private.maint_ok()))',
      t, (select string_agg(quote_ident(x), ', ') from unnest(roles) x));
    insert into private.maint_extras_state (kind, obj) values ('api_policy', t) on conflict do nothing;
  end loop;
end $$;

-- Flag probe for the public-api worker (api_reader has no table access): true when the production flag is on.
create or replace function private.maint_flag_on()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select f.enabled from public.app_feature_flags f
      where f.key = 'maintenanceModeEnabled' and f.environment = 'production'), false);
$$;
revoke all on function private.maint_flag_on() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'api_reader') then
    grant usage on schema private to api_reader;
    grant execute on function private.maint_flag_on() to api_reader;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Storage buckets
-- ---------------------------------------------------------------------------------------------------------------
create or replace function private.maint_bucket_ok(p_bucket text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.maint_ok())
    or not exists (select 1 from private.maint_bucket_state s where s.bucket_id = p_bucket);
$$;
revoke all on function private.maint_bucket_ok(text) from public;
grant execute on function private.maint_bucket_ok(text) to anon, authenticated;

create or replace function private.maint_bucket_admin(p_bucket text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(((auth.jwt() -> 'app_metadata') ->> 'role'), '') = 'admin'
    and exists (select 1 from private.maint_bucket_state s where s.bucket_id = p_bucket);
$$;
revoke all on function private.maint_bucket_admin(text) from public;
grant execute on function private.maint_bucket_admin(text) to authenticated;

-- Brings storage.buckets.public in line with the current flag, only for recorded buckets. Failures never abort the caller.
create or replace function private.maint_sync_buckets()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gate_on boolean;
begin
  gate_on := coalesce(
    (select f.enabled from public.app_feature_flags f
      where f.key = 'maintenanceModeEnabled' and f.environment = 'production'), false);
  begin
    if gate_on then
      update storage.buckets b set public = false
        from private.maint_bucket_state s where b.id = s.bucket_id and b.public is distinct from false;
    else
      update storage.buckets b set public = s.original_public
        from private.maint_bucket_state s where b.id = s.bucket_id and b.public is distinct from s.original_public;
    end if;
  exception when others then
    raise warning 'maintenance gate extras: bucket sync failed: %', sqlerrm;
  end;
end $$;
revoke all on function private.maint_sync_buckets() from public, anon, authenticated;

create or replace function private.maint_flag_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.key, old.key) = 'maintenanceModeEnabled' and coalesce(new.environment, old.environment) = 'production' then
    perform private.maint_sync_buckets();
  end if;
  return null;
end $$;
revoke all on function private.maint_flag_changed() from public, anon, authenticated;

do $$
declare
  b text;
  buckets text[] := array['home-resources','module-panels','patches','racks','manufacturer-logos','module-collections','marketplace-listings'];
  can_buckets boolean;
  can_objects boolean;
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise warning 'maintenance gate extras: storage schema not present, storage part skipped';
    return;
  end if;

  can_buckets := has_table_privilege(current_user, 'storage.buckets', 'UPDATE');
  can_objects := pg_has_role(current_user, (select c.relowner from pg_class c where c.oid = 'storage.objects'::regclass), 'member');

  if not can_buckets then
    raise warning 'maintenance gate extras: cannot update storage.buckets as %, bucket toggle skipped', current_user;
  else
    -- record originals once; a bucket already recorded keeps its first recorded value
    foreach b in array buckets loop
      insert into private.maint_bucket_state (bucket_id, original_public)
        select id, public from storage.buckets where id = b and public
        on conflict do nothing;
    end loop;
    drop trigger if exists zz_maint_flag_changed on public.app_feature_flags;
    create trigger zz_maint_flag_changed after insert or update or delete on public.app_feature_flags
      for each row execute function private.maint_flag_changed();
  end if;

  if not can_objects then
    raise warning 'maintenance gate extras: % may not manage policies on storage.objects, object policies skipped (bucket toggle only)', current_user;
  else
    execute 'drop policy if exists maint_gate_objects on storage.objects';
    execute 'create policy maint_gate_objects on storage.objects as restrictive for all to anon, authenticated '
            'using ((select private.maint_bucket_ok(bucket_id))) with check ((select private.maint_bucket_ok(bucket_id)))';
    execute 'drop policy if exists maint_admin_select_objects on storage.objects';
    execute 'create policy maint_admin_select_objects on storage.objects as permissive for select to authenticated '
            'using ((select private.maint_bucket_admin(bucket_id)))';
    insert into private.maint_extras_state (kind, obj) values ('storage_policy', 'objects') on conflict do nothing;
  end if;
end $$;

-- apply the current flag state right away (flag already on => buckets close now)
select private.maint_sync_buckets();

commit;
