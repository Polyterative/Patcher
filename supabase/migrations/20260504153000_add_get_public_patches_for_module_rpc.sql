create index if not exists patch_connections_a_index
  on public.patch_connections using btree (a);

create index if not exists patch_connections_b_index
  on public.patch_connections using btree (b);

create or replace function public.get_public_patches_for_module(
  p_module_id bigint,
  p_from integer default 0,
  p_to integer default 20,
  p_order_by text default 'updated',
  p_order_direction text default 'desc'
)
returns table (
  id bigint,
  name text,
  description text,
  created timestamp without time zone,
  updated timestamp without time zone,
  public boolean,
  tags text[],
  author jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  /*
   * Stable API contract for module details:
   * derive related patch ids explicitly from connection tables and return
   * already-filtered public patch rows. Do not depend on PostgREST inferring
   * reverse relationships through patches_for_modules.
   */
  with patch_ids as (
    select pc.patchid
    from public.module_outs mo
    join public.patch_connections pc on pc.a = mo.id
    where mo.moduleid = p_module_id

    union

    select pc.patchid
    from public.module_ins mi
    join public.patch_connections pc on pc.b = mi.id
    where mi.moduleid = p_module_id
  ),
  filtered_patches as (
    select
      p.id,
      p.name,
      p.description,
      p.created,
      p.updated,
      p.public,
      p.tags,
      jsonb_build_object(
        'id', profiles.id,
        'username', profiles.username
      ) as author
    from patch_ids
    join public.patches p on p.id = patch_ids.patchid
    join public.profiles on profiles.id = p.authorid
    where p.public = true
      and profiles.public = true
  )
  select
    filtered_patches.id,
    filtered_patches.name,
    filtered_patches.description,
    filtered_patches.created,
    filtered_patches.updated,
    filtered_patches.public,
    filtered_patches.tags,
    filtered_patches.author
  from filtered_patches
  order by
    case
      when lower(coalesce(p_order_by, 'updated')) = 'name'
        and lower(coalesce(p_order_direction, 'desc')) = 'asc'
      then filtered_patches.name
    end asc,
    case
      when lower(coalesce(p_order_by, 'updated')) = 'name'
        and lower(coalesce(p_order_direction, 'desc')) <> 'asc'
      then filtered_patches.name
    end desc,
    case
      when lower(coalesce(p_order_by, 'updated')) = 'created'
        and lower(coalesce(p_order_direction, 'desc')) = 'asc'
      then filtered_patches.created
    end asc,
    case
      when lower(coalesce(p_order_by, 'updated')) = 'created'
        and lower(coalesce(p_order_direction, 'desc')) <> 'asc'
      then filtered_patches.created
    end desc,
    case
      when lower(coalesce(p_order_by, 'updated')) not in ('name', 'created')
        and lower(coalesce(p_order_direction, 'desc')) = 'asc'
      then filtered_patches.updated
    end asc,
    case
      when lower(coalesce(p_order_by, 'updated')) not in ('name', 'created')
        and lower(coalesce(p_order_direction, 'desc')) <> 'asc'
      then filtered_patches.updated
    end desc,
    filtered_patches.updated desc,
    filtered_patches.id desc
  offset greatest(p_from, 0)
  limit greatest((p_to - p_from) + 1, 0);
$$;

revoke all on function public.get_public_patches_for_module(bigint, integer, integer, text, text) from public;
grant execute on function public.get_public_patches_for_module(bigint, integer, integer, text, text) to anon;
grant execute on function public.get_public_patches_for_module(bigint, integer, integer, text, text) to authenticated;
