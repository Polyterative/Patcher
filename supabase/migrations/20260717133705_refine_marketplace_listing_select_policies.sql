-- Marketplace listings advisor remediation.
-- Avoid multiple permissive authenticated SELECT policies while preserving
-- anon public-safe reads and authenticated owner/public reads.

drop policy if exists "marketplace_listings_select_public_active" on public.marketplace_listings;
drop policy if exists "marketplace_listings_select_own" on public.marketplace_listings;

create policy "marketplace_listings_select_public_active_anon"
  on public.marketplace_listings
  for select
  to anon
  using (public.is_marketplace_listing_public_safe(id));

create policy "marketplace_listings_select_public_or_own_authenticated"
  on public.marketplace_listings
  for select
  to authenticated
  using (
    public.is_marketplace_listing_public_safe(id)
    or (select auth.uid()) = seller_profileid
  );

drop policy if exists "listing_media_select_public_active_parent" on public.listing_media;
drop policy if exists "listing_media_select_own_parent" on public.listing_media;

create policy "listing_media_select_public_active_parent_anon"
  on public.listing_media
  for select
  to anon
  using (public.is_marketplace_listing_public_safe(listing_id));

create policy "listing_media_select_public_or_own_parent_authenticated"
  on public.listing_media
  for select
  to authenticated
  using (
    public.is_marketplace_listing_public_safe(listing_id)
    or exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = listing_id
        and ml.seller_profileid = (select auth.uid())
    )
  );
