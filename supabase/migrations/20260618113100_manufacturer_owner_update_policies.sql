-- Verified manufacturer-owner update policies. Existing admin/community policies are left intact.

alter table public.manufacturers enable row level security;
alter table public.modules enable row level security;

drop policy if exists "manufacturers_update_verified_owner" on public.manufacturers;
create policy "manufacturers_update_verified_owner"
  on public.manufacturers
  for update
  to authenticated
  using (
    "adminUser" = auth.uid()::text
    and verified_at is not null
  )
  with check (
    "adminUser" = auth.uid()::text
    and verified_at is not null
  );

drop policy if exists "modules_update_verified_manufacturer_owner" on public.modules;
create policy "modules_update_verified_manufacturer_owner"
  on public.modules
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.manufacturers mf
      where mf.id = modules."manufacturerId"
        and mf."adminUser" = auth.uid()::text
        and mf.verified_at is not null
    )
  )
  with check (
    exists (
      select 1
      from public.manufacturers mf
      where mf.id = modules."manufacturerId"
        and mf."adminUser" = auth.uid()::text
        and mf.verified_at is not null
    )
  );

create or replace function public.tg_prevent_module_manufacturer_reassign_for_non_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW."manufacturerId" is distinct from OLD."manufacturerId"
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Only admins can reassign module manufacturerId';
  end if;

  return NEW;
end;
$$;

comment on function public.tg_prevent_module_manufacturer_reassign_for_non_admin() is
  'BEFORE UPDATE trigger: prevents non-admin users, including verified owners, from reassigning modules to another manufacturer.';

drop trigger if exists trg_prevent_module_manufacturer_reassign_for_non_admin on public.modules;
create trigger trg_prevent_module_manufacturer_reassign_for_non_admin
  before update of "manufacturerId" on public.modules
  for each row execute function public.tg_prevent_module_manufacturer_reassign_for_non_admin();
