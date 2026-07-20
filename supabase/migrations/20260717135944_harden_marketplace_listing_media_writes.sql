-- Harden Marketplace media mutations after final concurrency/authorization review.
-- Owner-only deletes intentionally remain available so a seller can clean up
-- listing rows and storage after removing the SELLS possession marker.

create or replace function public.reorder_listing_media(
  p_listing_id uuid,
  p_media_ids uuid[]
)
returns setof public.listing_media
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_owner uuid := (select auth.uid());
  v_module_id bigint;
  v_distinct_count integer;
  v_current_count integer;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_listing_id::text, 0)
  );

  select ml.moduleid
    into v_module_id
    from public.marketplace_listings ml
    where ml.id = p_listing_id
      and ml.seller_profileid = v_owner;

  if v_module_id is null then
    raise exception 'Listing not found or not owned by current user';
  end if;

  if not private.is_marketplace_listing_sellable_by_owner(v_owner, v_module_id) then
    raise exception 'Listing module is no longer marked for sale';
  end if;

  perform 1
    from public.listing_media lm
    where lm.listing_id = p_listing_id
    for update;

  if p_media_ids is null or cardinality(p_media_ids) > 8 then
    raise exception 'Media order must contain between 0 and 8 image ids';
  end if;

  select count(distinct media_id)::integer
    into v_distinct_count
    from unnest(p_media_ids) as media_id;

  if v_distinct_count <> cardinality(p_media_ids) then
    raise exception 'Media order contains duplicate ids';
  end if;

  select count(*)::integer
    into v_current_count
    from public.listing_media lm
    where lm.listing_id = p_listing_id;

  if v_current_count <> cardinality(p_media_ids) then
    raise exception 'Media order must include every listing image';
  end if;

  if exists (
    select 1
    from unnest(p_media_ids) as media_id
    left join public.listing_media lm
      on lm.id = media_id
     and lm.listing_id = p_listing_id
    where lm.id is null
  ) then
    raise exception 'Media order contains an image outside this listing';
  end if;

  set constraints listing_media_listing_position_uniq deferred;

  update public.listing_media lm
     set position = ordered.ordinal - 1
    from unnest(p_media_ids) with ordinality as ordered(media_id, ordinal)
   where lm.id = ordered.media_id
     and lm.listing_id = p_listing_id;

  return query
    select lm.*
    from public.listing_media lm
    where lm.listing_id = p_listing_id
    order by lm.position asc, lm.id asc;
end;
$$;

revoke all on function public.reorder_listing_media(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_listing_media(uuid, uuid[]) to authenticated;

drop policy if exists "listing_media_insert_own_parent" on public.listing_media;
create policy "listing_media_insert_own_parent"
  on public.listing_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = listing_id
        and ml.seller_profileid = (select auth.uid())
        and private.is_marketplace_listing_sellable_by_owner(ml.seller_profileid, ml.moduleid)
        and storage_path ~ ('^' || (select auth.uid())::text || '/' || ml.id::text || '/')
    )
  );

drop policy if exists "listing_media_update_own_parent" on public.listing_media;
create policy "listing_media_update_own_parent"
  on public.listing_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = listing_id
        and ml.seller_profileid = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = listing_id
        and ml.seller_profileid = (select auth.uid())
        and private.is_marketplace_listing_sellable_by_owner(ml.seller_profileid, ml.moduleid)
        and storage_path ~ ('^' || (select auth.uid())::text || '/' || ml.id::text || '/')
    )
  );

drop policy if exists "marketplace_listing_images_insert_owner_path" on storage.objects;
create policy "marketplace_listing_images_insert_owner_path"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'marketplace-listings'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$')
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.id::text = split_part(name, '/', 2)
        and ml.seller_profileid = (select auth.uid())
        and private.is_marketplace_listing_sellable_by_owner(ml.seller_profileid, ml.moduleid)
    )
  );

drop policy if exists "marketplace_listing_images_update_owner_path" on storage.objects;
create policy "marketplace_listing_images_update_owner_path"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'marketplace-listings'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'marketplace-listings'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$')
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.id::text = split_part(name, '/', 2)
        and ml.seller_profileid = (select auth.uid())
        and private.is_marketplace_listing_sellable_by_owner(ml.seller_profileid, ml.moduleid)
    )
  );
