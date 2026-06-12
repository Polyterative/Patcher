create or replace function public.get_module_discovery_snapshot(
  p_limit integer default 5,
  p_min_count integer default 3
)
returns table (
  most_owned jsonb,
  most_wanted jsonb,
  most_sold jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      greatest(coalesce(p_limit, 5), 1) as item_limit,
      greatest(coalesce(p_min_count, 3), 1) as min_count
  ),
  module_counts as (
    select
      um.moduleid,
      sum(case when um.kind = 'HAS' then 1 else 0 end)::int as has_count,
      sum(case when um.kind = 'WANTS' then 1 else 0 end)::int as wants_count,
      sum(case when um.kind = 'SELLS' then 1 else 0 end)::int as sells_count
    from public.user_modules um
    join public.modules m on m.id = um.moduleid
    where m.public = true
    group by um.moduleid
  ),
  ranked_modules as (
    select
      m.id,
      m.name,
      man.id as manufacturer_id,
      man.name as manufacturer_name,
      c.has_count,
      c.wants_count,
      c.sells_count
    from module_counts c
    join public.modules m on m.id = c.moduleid
    join public.manufacturers man on man.id = m."manufacturerId"
  )
  select
    coalesce((
      select jsonb_agg(item)
      from (
        select
          jsonb_build_object(
            'id', id,
            'name', name,
            'manufacturer', jsonb_build_object('id', manufacturer_id, 'name', manufacturer_name),
            'count', has_count
          ) as item,
          has_count as sort_count,
          name as sort_name,
          id as sort_id
        from ranked_modules, params
        where has_count >= params.min_count
        order by sort_count desc, sort_name asc, sort_id asc
        limit params.item_limit
      ) ranked
    ), '[]'::jsonb) as most_owned,
    coalesce((
      select jsonb_agg(item)
      from (
        select
          jsonb_build_object(
            'id', id,
            'name', name,
            'manufacturer', jsonb_build_object('id', manufacturer_id, 'name', manufacturer_name),
            'count', wants_count
          ) as item,
          wants_count as sort_count,
          name as sort_name,
          id as sort_id
        from ranked_modules, params
        where wants_count >= params.min_count
        order by sort_count desc, sort_name asc, sort_id asc
        limit params.item_limit
      ) ranked
    ), '[]'::jsonb) as most_wanted,
    coalesce((
      select jsonb_agg(item)
      from (
        select
          jsonb_build_object(
            'id', id,
            'name', name,
            'manufacturer', jsonb_build_object('id', manufacturer_id, 'name', manufacturer_name),
            'count', sells_count
          ) as item,
          sells_count as sort_count,
          name as sort_name,
          id as sort_id
        from ranked_modules, params
        where sells_count >= params.min_count
        order by sort_count desc, sort_name asc, sort_id asc
        limit params.item_limit
      ) ranked
    ), '[]'::jsonb) as most_sold;
$$;

revoke all on function public.get_module_discovery_snapshot(integer, integer) from public;
grant execute on function public.get_module_discovery_snapshot(integer, integer) to anon;
grant execute on function public.get_module_discovery_snapshot(integer, integer) to authenticated;
