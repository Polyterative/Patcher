-- Reconcile marketplace policy drift from concurrent additive applies.
-- Marketplace-only: collapses duplicate permissive SELECT policies and keeps
-- policy helper functions out of the PostgREST-exposed public schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_marketplace_listing_public_safe(
  p_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.marketplace_listings ml
    join public.profiles p on p.id = ml.seller_profileid
    where ml.id = p_listing_id
      and ml.status in ('active', 'reserved')
      and p.public = true
  );
$$;

create or replace function private.is_marketplace_listing_sellable_by_owner(
  p_seller_profileid uuid,
  p_moduleid bigint
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_modules um
    where um.profileid = p_seller_profileid
      and um.moduleid = p_moduleid
      and um.kind = 'SELLS'
  );
$$;

revoke all on function private.is_marketplace_listing_public_safe(uuid) from public, anon, authenticated;
revoke all on function private.is_marketplace_listing_sellable_by_owner(uuid, bigint) from public, anon, authenticated;
grant execute on function private.is_marketplace_listing_public_safe(uuid) to anon, authenticated;
grant execute on function private.is_marketplace_listing_sellable_by_owner(uuid, bigint) to authenticated;

drop policy if exists "marketplace_listings_select_public" on public.marketplace_listings;
drop policy if exists "marketplace_listings_select_own" on public.marketplace_listings;
drop policy if exists "marketplace_listings_select_public_active_anon" on public.marketplace_listings;
drop policy if exists "marketplace_listings_select_public_or_own_authenticated" on public.marketplace_listings;

create policy "marketplace_listings_select_public_active_anon"
  on public.marketplace_listings
  for select
  to anon
  using (private.is_marketplace_listing_public_safe(id));

create policy "marketplace_listings_select_public_or_own_authenticated"
  on public.marketplace_listings
  for select
  to authenticated
  using (
    private.is_marketplace_listing_public_safe(id)
    or (select auth.uid()) = seller_profileid
  );

drop policy if exists "marketplace_listings_insert_own_sellable" on public.marketplace_listings;
create policy "marketplace_listings_insert_own_sellable"
  on public.marketplace_listings
  for insert
  to authenticated
  with check (
    (select auth.uid()) = seller_profileid
    and private.is_marketplace_listing_sellable_by_owner(seller_profileid, moduleid)
  );

drop policy if exists "marketplace_listings_update_own_sellable" on public.marketplace_listings;
create policy "marketplace_listings_update_own_sellable"
  on public.marketplace_listings
  for update
  to authenticated
  using ((select auth.uid()) = seller_profileid)
  with check (
    (select auth.uid()) = seller_profileid
    and private.is_marketplace_listing_sellable_by_owner(seller_profileid, moduleid)
  );

drop policy if exists "listing_media_select_public_parent" on public.listing_media;
drop policy if exists "listing_media_select_own_parent" on public.listing_media;
drop policy if exists "listing_media_select_public_active_parent_anon" on public.listing_media;
drop policy if exists "listing_media_select_public_or_own_parent_authenticated" on public.listing_media;

create policy "listing_media_select_public_active_parent_anon"
  on public.listing_media
  for select
  to anon
  using (private.is_marketplace_listing_public_safe(listing_id));

create policy "listing_media_select_public_or_own_parent_authenticated"
  on public.listing_media
  for select
  to authenticated
  using (
    private.is_marketplace_listing_public_safe(listing_id)
    or exists (
        select 1
        from public.marketplace_listings ml
        where ml.id = listing_id
          and ml.seller_profileid = (select auth.uid())
      )
  );

drop policy if exists "marketplace_listing_images_select_public_parent" on storage.objects;
drop policy if exists "marketplace_listing_images_select_public_active_parent" on storage.objects;
drop policy if exists "marketplace_listing_images_select_owner" on storage.objects;
drop policy if exists "marketplace_listing_images_select_public_active_parent_anon" on storage.objects;
drop policy if exists "marketplace_listing_images_select_public_or_owner_authenticated" on storage.objects;

create policy "marketplace_listing_images_select_public_active_parent_anon"
  on storage.objects
  for select
  to anon
  using (
    bucket_id = 'marketplace-listings'
    and exists (
      select 1
      from public.listing_media lm
      where lm.storage_path = storage.objects.name
        and private.is_marketplace_listing_public_safe(lm.listing_id)
    )
  );

create policy "marketplace_listing_images_select_public_or_owner_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'marketplace-listings'
    and (
      split_part(name, '/', 1) = (select auth.uid())::text
      or exists (
        select 1
        from public.listing_media lm
        where lm.storage_path = storage.objects.name
          and private.is_marketplace_listing_public_safe(lm.listing_id)
      )
    )
  );

drop function if exists public.is_marketplace_listing_public_safe(uuid);
drop function if exists public.is_marketplace_listing_sellable_by_owner(uuid, bigint);
drop index if exists public.marketplace_listings_public_active_idx;
