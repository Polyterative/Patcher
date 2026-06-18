-- Manufacturer-set module availability tags.

create table if not exists public.module_availability_tags (
  module_id integer not null references public.modules(id) on delete cascade,
  tag text not null,
  set_by uuid not null references public.profiles(id) on delete restrict,
  set_at timestamptz not null default now(),
  primary key (module_id, tag),
  constraint module_availability_tags_tag_check check (
    tag in (
      'available_new',
      'available_resellers',
      'kit_diy',
      'prototype',
      'limited_stock',
      'discontinued',
      'contact_manufacturer'
    )
  )
);

create index if not exists module_availability_tags_tag_idx
  on public.module_availability_tags (tag);

alter table public.module_availability_tags enable row level security;

drop policy if exists "module_availability_tags_select_all" on public.module_availability_tags;
create policy "module_availability_tags_select_all"
  on public.module_availability_tags
  for select
  to public
  using (true);

drop policy if exists "module_availability_tags_insert_owner_or_admin" on public.module_availability_tags;
create policy "module_availability_tags_insert_owner_or_admin"
  on public.module_availability_tags
  for insert
  to authenticated
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or (
      set_by = auth.uid()
      and exists (
        select 1
        from public.modules m
        join public.manufacturers mf on mf.id = m."manufacturerId"
        where m.id = module_availability_tags.module_id
          and mf."adminUser" = auth.uid()::text
          and mf.verified_at is not null
      )
    )
  );

drop policy if exists "module_availability_tags_update_owner_or_admin" on public.module_availability_tags;
create policy "module_availability_tags_update_owner_or_admin"
  on public.module_availability_tags
  for update
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.modules m
      join public.manufacturers mf on mf.id = m."manufacturerId"
      where m.id = module_availability_tags.module_id
        and mf."adminUser" = auth.uid()::text
        and mf.verified_at is not null
    )
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or (
      set_by = auth.uid()
      and exists (
        select 1
        from public.modules m
        join public.manufacturers mf on mf.id = m."manufacturerId"
        where m.id = module_availability_tags.module_id
          and mf."adminUser" = auth.uid()::text
          and mf.verified_at is not null
      )
    )
  );

drop policy if exists "module_availability_tags_delete_owner_or_admin" on public.module_availability_tags;
create policy "module_availability_tags_delete_owner_or_admin"
  on public.module_availability_tags
  for delete
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.modules m
      join public.manufacturers mf on mf.id = m."manufacturerId"
      where m.id = module_availability_tags.module_id
        and mf."adminUser" = auth.uid()::text
        and mf.verified_at is not null
    )
  );
