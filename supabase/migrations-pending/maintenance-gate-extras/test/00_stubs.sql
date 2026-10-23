-- Disposable-database stubs for the extras harness. NEVER run against a real database.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'api_view_owner') then create role api_view_owner nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'api_reader') then create role api_reader nologin; end if;
end $$;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create schema private;
grant usage on schema public, auth, private to anon, authenticated, api_view_owner, api_reader;
grant execute on all functions in schema auth to anon, authenticated, api_view_owner, api_reader;

create table public.app_feature_flags (
  key text not null, environment text not null check (environment in ('production','development')),
  enabled boolean not null, primary key (key, environment));
alter table public.app_feature_flags enable row level security;
create policy flags_all on public.app_feature_flags for all to anon, authenticated using (true) with check (true);
grant all on public.app_feature_flags to anon, authenticated;

-- base gate helper, same definition as the base migration
create function private.maint_ok() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(((auth.jwt() -> 'app_metadata') ->> 'role'), '') = 'admin'
    or not coalesce((select f.enabled from public.app_feature_flags f
        where f.key = 'maintenanceModeEnabled' and f.environment = 'production'), false);
$$;
revoke all on function private.maint_ok() from public;
grant execute on function private.maint_ok() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['modules','manufacturers','module_ins','module_outs','module_panels','module_tags','tags','standards'] loop
    execute format('create table public.%I (id serial primary key, payload text default ''x'')', t);
    execute format('insert into public.%I default values', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy open_all on public.%I for select to api_view_owner, api_reader, anon, authenticated using (true)', t);
    execute format('grant select on public.%I to api_view_owner, api_reader, anon, authenticated', t);
  end loop;
end $$;

-- minimal storage stand-in
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id serial primary key, bucket_id text references storage.buckets(id), name text);
alter table storage.objects enable row level security;
create policy objects_public_read on storage.objects for select to anon, authenticated using (bucket_id in ('racks','home-resources','module-panels','patches','manufacturer-logos'));
create policy objects_other_write on storage.objects for all to authenticated using (true) with check (true);
grant usage on schema storage to anon, authenticated;
grant all on storage.objects, storage.buckets to anon, authenticated;
grant usage on all sequences in schema storage to anon, authenticated;
insert into storage.buckets values
  ('home-resources','home-resources',true), ('module-panels','module-panels',true), ('patches','patches',true),
  ('racks','racks',true), ('manufacturer-logos','manufacturer-logos',false), ('marketplace-listings','marketplace-listings',false),
  ('unrelated','unrelated',true), ('other-private','other-private',false);
insert into storage.objects (bucket_id, name) values ('racks','a.png'), ('unrelated','b.png'), ('manufacturer-logos','c.png');
