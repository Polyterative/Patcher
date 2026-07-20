-- Marketplace listings policy drift cleanup.
-- Remove superseded SELECT policies left by earlier iterations and ensure
-- predicate helpers are security invoker so advisor warnings stay clear.

drop policy if exists "marketplace_listings_select_public" on public.marketplace_listings;
drop policy if exists "marketplace_listings_select_own" on public.marketplace_listings;
drop policy if exists "listing_media_select_public_parent" on public.listing_media;
drop policy if exists "listing_media_select_own_parent" on public.listing_media;

drop policy if exists "marketplace_listing_images_select_public_parent" on storage.objects;
drop policy if exists "marketplace_listing_images_select_owner" on storage.objects;

alter function public.is_marketplace_listing_public_safe(uuid) security invoker;
alter function public.is_marketplace_listing_sellable_by_owner(uuid, bigint) security invoker;

grant execute on function public.is_marketplace_listing_public_safe(uuid) to anon, authenticated;
grant execute on function public.is_marketplace_listing_sellable_by_owner(uuid, bigint) to authenticated;
