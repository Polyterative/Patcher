-- Community trend snapshot cache for the homepage discovery card.
-- The materialized view keeps per-request RPC calls from scanning user_modules.

drop function if exists public.get_module_discovery_snapshot(integer, integer);
drop function if exists public.refresh_module_discovery_snapshot();
drop materialized view if exists public.module_discovery_snapshot;

create materialized view public.module_discovery_snapshot as
with module_counts as (
  select
    um.moduleid,
    sum(case when um.kind = 'HAS' then 1 else 0 end)::integer as has_count,
    sum(case when um.kind = 'WANTS' then 1 else 0 end)::integer as wants_count,
    sum(case when um.kind = 'SELLS' then 1 else 0 end)::integer as sells_count
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
  discovery.bucket,
  ranked_modules.id,
  ranked_modules.name,
  ranked_modules.manufacturer_id,
  ranked_modules.manufacturer_name,
  discovery.trend_count
from ranked_modules
cross join lateral (
  values
    ('most_owned'::text, ranked_modules.has_count),
    ('most_wanted'::text, ranked_modules.wants_count),
    ('most_sold'::text, ranked_modules.sells_count)
) as discovery(bucket, trend_count)
where discovery.trend_count > 0;

create unique index module_discovery_snapshot_bucket_id_uniq
  on public.module_discovery_snapshot (bucket, id);

create index module_discovery_snapshot_bucket_rank_idx
  on public.module_discovery_snapshot (bucket, trend_count desc, name asc, id asc);

revoke all on public.module_discovery_snapshot from anon;
revoke all on public.module_discovery_snapshot from authenticated;

comment on materialized view public.module_discovery_snapshot is
  'Cached public module ownership/want/sell counts used by the homepage community trends card.';

create or replace function public.refresh_module_discovery_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.module_discovery_snapshot;
end;
$$;

revoke all on function public.refresh_module_discovery_snapshot() from public;
revoke execute on function public.refresh_module_discovery_snapshot() from anon;
revoke execute on function public.refresh_module_discovery_snapshot() from authenticated;

comment on function public.refresh_module_discovery_snapshot() is
  'Refreshes the cached public module discovery snapshot. Scheduled hourly by pg_cron.';

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
  ranked as (
    select
      bucket,
      jsonb_build_object(
        'id', id,
        'name', name,
        'manufacturer', jsonb_build_object('id', manufacturer_id, 'name', manufacturer_name),
        'count', trend_count
      ) as item,
      row_number() over (partition by bucket order by trend_count desc, name asc, id asc) as bucket_rank
    from public.module_discovery_snapshot, params
    where trend_count >= params.min_count
  )
  select
    coalesce(jsonb_agg(item order by bucket_rank) filter (where bucket = 'most_owned'), '[]'::jsonb) as most_owned,
    coalesce(jsonb_agg(item order by bucket_rank) filter (where bucket = 'most_wanted'), '[]'::jsonb) as most_wanted,
    coalesce(jsonb_agg(item order by bucket_rank) filter (where bucket = 'most_sold'), '[]'::jsonb) as most_sold
  from ranked, params
  where bucket_rank <= params.item_limit;
$$;

revoke all on function public.get_module_discovery_snapshot(integer, integer) from public;
grant execute on function public.get_module_discovery_snapshot(integer, integer) to anon;
grant execute on function public.get_module_discovery_snapshot(integer, integer) to authenticated;

create extension if not exists pg_cron with schema extensions;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'refresh-module-discovery-snapshot'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'refresh-module-discovery-snapshot',
    '17 * * * *',
    'select public.refresh_module_discovery_snapshot();'
  );
end;
$$;
