create or replace function public.get_module_usage_summary(
  p_module_id bigint
)
returns table (
  public_rack_count bigint,
  hidden_rack_count bigint,
  public_patch_count bigint,
  hidden_patch_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with rack_ids as (
    select distinct rm.rackid
    from public.rack_modules rm
    where rm.moduleid = p_module_id
  ),
  public_racks as (
    select distinct r.id
    from rack_ids
    join public.racks r on r.id = rack_ids.rackid
    join public.profiles on profiles.id = r.authorid
    where r.public = true
      and profiles.public = true
  ),
  patch_ids as (
    select distinct pc.patchid
    from public.module_outs mo
    join public.patch_connections pc on pc.a = mo.id
    where mo.moduleid = p_module_id

    union

    select distinct pc.patchid
    from public.module_ins mi
    join public.patch_connections pc on pc.b = mi.id
    where mi.moduleid = p_module_id
  ),
  public_patches as (
    select distinct p.id
    from patch_ids
    join public.patches p on p.id = patch_ids.patchid
    join public.profiles on profiles.id = p.authorid
    where p.public = true
      and profiles.public = true
  )
  select
    (select count(*) from public_racks) as public_rack_count,
    greatest((select count(*) from rack_ids) - (select count(*) from public_racks), 0) as hidden_rack_count,
    (select count(*) from public_patches) as public_patch_count,
    greatest((select count(*) from patch_ids) - (select count(*) from public_patches), 0) as hidden_patch_count;
$$;

revoke all on function public.get_module_usage_summary(bigint) from public;
grant execute on function public.get_module_usage_summary(bigint) to anon;
grant execute on function public.get_module_usage_summary(bigint) to authenticated;
