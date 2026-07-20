-- Remove the legacy database trigger that deletes Storage metadata directly.
-- Marketplace media cleanup is performed through the authenticated Storage API
-- before deleting listing_media rows, so physical objects and metadata stay in sync.

drop trigger if exists trg_listing_media_delete_storage_object on public.listing_media;
drop function if exists public.tg_listing_media_delete_storage_object();
