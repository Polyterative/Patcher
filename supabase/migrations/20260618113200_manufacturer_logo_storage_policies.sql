-- Manufacturer logo bucket and storage policies. The bucket is public for reads;
-- writes are limited to verified owners of the manufacturer encoded in the filename
-- (`manufacturer_<id>_<timestamp>.<ext>`) or app admins.

insert into storage.buckets (id, name, public)
values ('manufacturer-logos', 'manufacturer-logos', true)
on conflict (id) do nothing;

drop policy if exists "manufacturer_logos_insert_owner_or_admin" on storage.objects;
create policy "manufacturer_logos_insert_owner_or_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'manufacturer-logos'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.manufacturers mf
        where mf.id = substring(storage.filename(name) from '^manufacturer_([0-9]+)_')::integer
          and mf."adminUser" = auth.uid()::text
          and mf.verified_at is not null
      )
    )
  );

drop policy if exists "manufacturer_logos_update_owner_or_admin" on storage.objects;
create policy "manufacturer_logos_update_owner_or_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'manufacturer-logos'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.manufacturers mf
        where mf.id = substring(storage.filename(name) from '^manufacturer_([0-9]+)_')::integer
          and mf."adminUser" = auth.uid()::text
          and mf.verified_at is not null
      )
    )
  )
  with check (
    bucket_id = 'manufacturer-logos'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.manufacturers mf
        where mf.id = substring(storage.filename(name) from '^manufacturer_([0-9]+)_')::integer
          and mf."adminUser" = auth.uid()::text
          and mf.verified_at is not null
      )
    )
  );

drop policy if exists "manufacturer_logos_delete_owner_or_admin" on storage.objects;
create policy "manufacturer_logos_delete_owner_or_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'manufacturer-logos'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.manufacturers mf
        where mf.id = substring(storage.filename(name) from '^manufacturer_([0-9]+)_')::integer
          and mf."adminUser" = auth.uid()::text
          and mf.verified_at is not null
      )
    )
  );
