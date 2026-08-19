-- Price Hub snapshot compaction (plan: price-hub-snapshot-compaction.md)
-- 1) Latest adapter/match diagnostics live on the listing (overwritten per crawl)
--    instead of every snapshot row (was 87% of table heap with zero readers).
alter table public.module_store_listings
  add column last_raw_meta jsonb;

comment on column public.module_store_listings.last_raw_meta is
  'Latest adapter/match diagnostic payload for this listing, overwritten on each crawl. Historical copies are not kept on snapshots.';

-- 2) Index-backed top-2-per-listing fetch for the change-only snapshot planner.
--    PostgREST has no top-N-per-group; a flat IN() fetch would pull full history.
--    SECURITY INVOKER: callers see only rows their RLS already allows (SELECT-only for anon/auth).
create or replace function public.price_hub_latest_snapshots(p_listing_ids bigint[])
returns setof public.module_price_snapshots
language sql
stable
set search_path = ''
as $$
  select s.*
  from unnest(p_listing_ids) as l(listing_id)
  cross join lateral (
    select *
    from public.module_price_snapshots s2
    where s2.listing_id = l.listing_id
    order by s2.observed_at desc, s2.id desc
    limit 2
  ) s
$$;

comment on function public.price_hub_latest_snapshots(bigint[]) is
  'Latest two snapshots per listing (observed_at desc, id desc), index-backed via lateral limit 2. Used by change-only crawl writers to decide insert-start / update-endpoint / insert-endpoint.';
