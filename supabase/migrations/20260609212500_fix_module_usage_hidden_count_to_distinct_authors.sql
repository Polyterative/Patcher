-- Fix get_module_usage_summary_bucketed: hidden-usage count was counting distinct
-- racks/patches, which lets one user with N private racks make a module appear as
-- if N different people privately use it. That misleads the "Plus 25+ private or
-- otherwise hidden racks" label — in production the entire `25_plus` bucket was
-- driven by single users with bulk-created private racks.
--
-- New semantics for hidden_*_count:
--   distinct authors who have at least one rack/patch containing this module AND
--   no publicly-visible rack/patch containing this module.
--
-- Authors with at least one public rack/patch are already represented in the
-- public list, so they're excluded from the "hidden" social-signal count.
--
-- Public counts (public_rack_count / public_patch_count) keep the original
-- distinct-rack / distinct-patch semantics — the UI lists individual racks/patches
-- for them, so per-row counting is what the user expects there.

create or replace function public.get_module_usage_summary_bucketed(
  p_module_id bigint
)
returns table (
  public_rack_count bigint,
  hidden_rack_bucket text,
  public_patch_count bigint,
  hidden_patch_bucket text
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- Every rack containing the module, joined to its rack and author profile.
  -- Inner joins drop any orphan rack_modules (deleted rack or deleted profile).
  rack_usage as (
    select distinct r.id as rack_id, r.authorid, r.public as rack_public, pr.public as profile_public
    from public.rack_modules rm
    join public.racks r       on r.id  = rm.rackid
    join public.profiles pr   on pr.id = r.authorid
    where rm.moduleid = p_module_id
  ),
  public_racks as (
    select rack_id, authorid
    from rack_usage
    where rack_public = true and profile_public = true
  ),
  -- Authors who own at least one rack with this module but have no publicly-
  -- visible rack with it. These are the "hidden" social signal.
  hidden_rack_authors as (
    select distinct authorid
    from rack_usage
    where authorid not in (select authorid from public_racks)
  ),

  -- Patches: same idea, base set joined through patches + profiles so deleted
  -- accounts and missing patches don't slip in.
  patch_usage as (
    select distinct p.id as patch_id, p.authorid, p.public as patch_public, pr.public as profile_public
    from (
      select pc.patchid
      from public.module_outs mo
      join public.patch_connections pc on pc.a = mo.id
      where mo.moduleid = p_module_id
      union
      select pc.patchid
      from public.module_ins mi
      join public.patch_connections pc on pc.b = mi.id
      where mi.moduleid = p_module_id
    ) ids
    join public.patches p   on p.id  = ids.patchid
    join public.profiles pr on pr.id = p.authorid
  ),
  public_patches as (
    select patch_id, authorid
    from patch_usage
    where patch_public = true and profile_public = true
  ),
  hidden_patch_authors as (
    select distinct authorid
    from patch_usage
    where authorid not in (select authorid from public_patches)
  ),

  counts as (
    select
      (select count(*) from public_racks)         as public_rack_count,
      (select count(*) from hidden_rack_authors)  as hidden_rack_count,
      (select count(*) from public_patches)       as public_patch_count,
      (select count(*) from hidden_patch_authors) as hidden_patch_count
  )
  select
    counts.public_rack_count,
    case
      when counts.hidden_rack_count = 0  then 'none'
      when counts.hidden_rack_count < 5  then 'some'
      when counts.hidden_rack_count < 10 then '5_plus'
      when counts.hidden_rack_count < 25 then '10_plus'
      else '25_plus'
    end as hidden_rack_bucket,
    counts.public_patch_count,
    case
      when counts.hidden_patch_count = 0  then 'none'
      when counts.hidden_patch_count < 5  then 'some'
      when counts.hidden_patch_count < 10 then '5_plus'
      when counts.hidden_patch_count < 25 then '10_plus'
      else '25_plus'
    end as hidden_patch_bucket
  from counts;
$$;

revoke all on function public.get_module_usage_summary_bucketed(bigint) from public;
grant execute on function public.get_module_usage_summary_bucketed(bigint) to anon;
grant execute on function public.get_module_usage_summary_bucketed(bigint) to authenticated;
