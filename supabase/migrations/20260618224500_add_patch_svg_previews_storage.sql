-- Patch SVG preview storage checkpoint.
-- Adds a nullable filename column without backfilling existing rows, then
-- creates the public SVG bucket and owner/admin write policies approved for
-- this feature.

alter table public.patches
  add column if not exists image text null;

comment on column public.patches.image is
  'Supabase Storage filename for the generated SVG patch preview in the patches bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patches', 'patches', true, 1048576, array['image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "patch_previews_insert_owner_or_admin" on storage.objects;
create policy "patch_previews_insert_owner_or_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'patches'
    and lower(storage.extension(name)) = 'svg'
    and storage.filename(name) ~ '^patch_[0-9]+_v[0-9]{8}t[0-9]{9}z\.svg$'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid::text = auth.uid()::text
      )
    )
  );

drop policy if exists "patch_previews_update_owner_or_admin" on storage.objects;
create policy "patch_previews_update_owner_or_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'patches'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid::text = auth.uid()::text
      )
    )
  )
  with check (
    bucket_id = 'patches'
    and lower(storage.extension(name)) = 'svg'
    and storage.filename(name) ~ '^patch_[0-9]+_v[0-9]{8}t[0-9]{9}z\.svg$'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid::text = auth.uid()::text
      )
    )
  );

drop policy if exists "patch_previews_delete_owner_or_admin" on storage.objects;
create policy "patch_previews_delete_owner_or_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'patches'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid::text = auth.uid()::text
      )
    )
  );
