-- Marketplace listings core/media foundation.
-- Additive only: creates listing tables, owner/public-safe RLS, ordered image media,
-- image storage bucket/policies, and an atomic media reorder RPC. No backfills.

create table if not exists public.marketplace_listings (
  id uuid primary key default extensions.gen_random_uuid(),
  public_id text not null default public.generate_public_id(),
  seller_profileid uuid not null references public.profiles(id) on delete cascade,
  moduleid bigint not null references public.modules(id),
  title_override text null,
  description text null,
  condition text not null,
  asking_price_amount_minor bigint not null,
  asking_price_currency text not null,
  open_to_offers boolean not null default false,
  ships_from_country text not null,
  shipping_options text[] not null default '{}'::text[],
  shipping_notes text null,
  external_link text null,
  status text not null default 'draft',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone null,
  constraint marketplace_listings_condition_supported
    check (condition in ('new', 'excellent', 'good', 'fair', 'for_parts')),
  constraint marketplace_listings_status_supported
    check (status in ('draft', 'active', 'paused', 'reserved', 'closed_sold', 'closed_unsold', 'expired')),
  constraint marketplace_listings_price_non_negative
    check (asking_price_amount_minor >= 0),
  constraint marketplace_listings_currency_format
    check (asking_price_currency ~ '^[A-Z]{3}$'),
  constraint marketplace_listings_ships_from_country_format
    check (ships_from_country ~ '^[A-Z]{2}$'),
  constraint marketplace_listings_title_override_length
    check (title_override is null or char_length(title_override) <= 120),
  constraint marketplace_listings_description_length
    check (description is null or char_length(description) <= 5000),
  constraint marketplace_listings_shipping_options_length
    check (array_length(shipping_options, 1) is null or array_length(shipping_options, 1) <= 12),
  constraint marketplace_listings_shipping_notes_length
    check (shipping_notes is null or char_length(shipping_notes) <= 500),
  constraint marketplace_listings_external_link_length
    check (external_link is null or char_length(external_link) <= 2048),
  constraint marketplace_listings_external_link_http
    check (external_link is null or external_link ~* '^https?://')
);

create table if not exists public.listing_media (
  id uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  kind text not null default 'image',
  url text not null,
  storage_path text not null,
  position integer not null,
  mime_type text not null,
  created_at timestamp with time zone not null default now(),
  constraint listing_media_kind_image_only check (kind = 'image'),
  constraint listing_media_supported_mime_type check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint listing_media_position_range check (position >= 0 and position < 8),
  constraint listing_media_url_proxy check (url ~ '^https://images\.patcher\.xyz/marketplace-listings/'),
  constraint listing_media_storage_path_owner_safe check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$'
  )
);

create unique index if not exists marketplace_listings_public_id_uniq
  on public.marketplace_listings (public_id);

create unique index if not exists marketplace_listings_one_active_per_seller_module_idx
  on public.marketplace_listings (seller_profileid, moduleid)
  where status = 'active';

create index if not exists marketplace_listings_public_active_idx
  on public.marketplace_listings (status, updated_at desc, id desc)
  where status = 'active';

create index if not exists marketplace_listings_seller_status_idx
  on public.marketplace_listings (seller_profileid, status, updated_at desc, id desc);

create index if not exists marketplace_listings_module_idx
  on public.marketplace_listings (moduleid, status, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listing_media_listing_position_uniq'
      and conrelid = 'public.listing_media'::regclass
  ) then
    alter table public.listing_media
      add constraint listing_media_listing_position_uniq
      unique (listing_id, position)
      deferrable initially immediate;
  end if;
end;
$$;

create unique index if not exists listing_media_storage_path_uniq
  on public.listing_media (storage_path);

create index if not exists listing_media_listing_order_idx
  on public.listing_media (listing_id, position, id);

alter table public.marketplace_listings enable row level security;
alter table public.listing_media enable row level security;

revoke all on table public.marketplace_listings from anon, authenticated;
revoke all on table public.listing_media from anon, authenticated;
grant select on table public.marketplace_listings to anon, authenticated;
grant select on table public.listing_media to anon, authenticated;
grant insert, update, delete on table public.marketplace_listings to authenticated;
grant insert, update, delete on table public.listing_media to authenticated;

create or replace function public.is_marketplace_listing_public_safe(
  p_listing_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.marketplace_listings ml
    join public.modules m on m.id = ml.moduleid
    join public.profiles p on p.id = ml.seller_profileid
    where ml.id = p_listing_id
      and ml.status = 'active'
      and m.public = true
      and p.public = true
  );
$$;

comment on function public.is_marketplace_listing_public_safe(uuid) is
  'Returns true only for active listings whose canonical module and seller profile are public-safe.';

create or replace function public.is_marketplace_listing_sellable_by_owner(
  p_seller_profileid uuid,
  p_moduleid bigint
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_modules um
    where um.profileid = p_seller_profileid
      and um.moduleid = p_moduleid
      and um.kind = 'SELLS'
  );
$$;

comment on function public.is_marketplace_listing_sellable_by_owner(uuid, bigint) is
  'Requires the existing user_modules SELLS possession marker before a seller can save a listing for a module.';

create or replace function public.tg_marketplace_listings_touch_updated()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_marketplace_listings_public_id on public.marketplace_listings;
create trigger trg_marketplace_listings_public_id
  before insert on public.marketplace_listings
  for each row execute function public.tg_set_public_id();

drop trigger if exists trg_marketplace_listings_touch_updated on public.marketplace_listings;
create trigger trg_marketplace_listings_touch_updated
  before update on public.marketplace_listings
  for each row execute function public.tg_marketplace_listings_touch_updated();

create or replace function public.tg_listing_media_enforce_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::integer
    into v_count
    from public.listing_media lm
    where lm.listing_id = new.listing_id
      and (tg_op <> 'UPDATE' or lm.id is distinct from new.id);

  if v_count >= 8 then
    raise exception 'Marketplace listings support at most 8 images';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listing_media_enforce_limit on public.listing_media;
create trigger trg_listing_media_enforce_limit
  before insert or update of listing_id on public.listing_media
  for each row execute function public.tg_listing_media_enforce_limit();

create or replace function public.tg_listing_media_delete_storage_object()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'marketplace-listings'
    and name = old.storage_path;

  return old;
end;
$$;

drop trigger if exists trg_listing_media_delete_storage_object on public.listing_media;
create trigger trg_listing_media_delete_storage_object
  after delete on public.listing_media
  for each row execute function public.tg_listing_media_delete_storage_object();

create or replace function public.reorder_listing_media(
  p_listing_id uuid,
  p_media_ids uuid[]
)
returns setof public.listing_media
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_distinct_count integer;
  v_current_count integer;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  if array_length(p_media_ids, 1) is null then
    return query
      select lm.*
      from public.listing_media lm
      where lm.listing_id = p_listing_id
      order by lm.position asc, lm.id asc;
    return;
  end if;

  if array_length(p_media_ids, 1) > 8 then
    raise exception 'Marketplace listings support at most 8 images';
  end if;

  if not exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = p_listing_id
      and ml.seller_profileid = v_owner
  ) then
    raise exception 'Listing not found or not owned by current user';
  end if;

  select count(distinct media_id)::integer
    into v_distinct_count
    from unnest(p_media_ids) as media_id;

  if v_distinct_count <> array_length(p_media_ids, 1) then
    raise exception 'Media order contains duplicate ids';
  end if;

  select count(*)::integer
    into v_current_count
    from public.listing_media lm
    where lm.listing_id = p_listing_id;

  if v_current_count <> array_length(p_media_ids, 1) then
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

comment on function public.reorder_listing_media(uuid, uuid[]) is
  'Atomically reorders all images for an owned listing, preserving dense positions and the 8 image cap.';

drop policy if exists "marketplace_listings_select_public_active" on public.marketplace_listings;
create policy "marketplace_listings_select_public_active"
  on public.marketplace_listings
  for select
  to anon, authenticated
  using (public.is_marketplace_listing_public_safe(id));

drop policy if exists "marketplace_listings_select_own" on public.marketplace_listings;
create policy "marketplace_listings_select_own"
  on public.marketplace_listings
  for select
  to authenticated
  using ((select auth.uid()) = seller_profileid);

drop policy if exists "marketplace_listings_insert_own_sellable" on public.marketplace_listings;
create policy "marketplace_listings_insert_own_sellable"
  on public.marketplace_listings
  for insert
  to authenticated
  with check (
    (select auth.uid()) = seller_profileid
    and public.is_marketplace_listing_sellable_by_owner(seller_profileid, moduleid)
  );

drop policy if exists "marketplace_listings_update_own_sellable" on public.marketplace_listings;
create policy "marketplace_listings_update_own_sellable"
  on public.marketplace_listings
  for update
  to authenticated
  using ((select auth.uid()) = seller_profileid)
  with check (
    (select auth.uid()) = seller_profileid
    and public.is_marketplace_listing_sellable_by_owner(seller_profileid, moduleid)
  );

drop policy if exists "marketplace_listings_delete_own" on public.marketplace_listings;
create policy "marketplace_listings_delete_own"
  on public.marketplace_listings
  for delete
  to authenticated
  using ((select auth.uid()) = seller_profileid);

drop policy if exists "listing_media_select_public_active_parent" on public.listing_media;
create policy "listing_media_select_public_active_parent"
  on public.listing_media
  for select
  to anon, authenticated
  using (public.is_marketplace_listing_public_safe(listing_id));

drop policy if exists "listing_media_select_own_parent" on public.listing_media;
create policy "listing_media_select_own_parent"
  on public.listing_media
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = listing_id
        and ml.seller_profileid = (select auth.uid())
    )
  );

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
        and storage_path ~ ('^' || (select auth.uid())::text || '/' || ml.id::text || '/')
    )
  );

drop policy if exists "listing_media_delete_own_parent" on public.listing_media;
create policy "listing_media_delete_own_parent"
  on public.listing_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = listing_id
        and ml.seller_profileid = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketplace-listings',
  'marketplace-listings',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marketplace_listing_images_select_public_active_parent" on storage.objects;
create policy "marketplace_listing_images_select_public_active_parent"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'marketplace-listings'
    and exists (
      select 1
      from public.listing_media lm
      where lm.storage_path = storage.objects.name
        and public.is_marketplace_listing_public_safe(lm.listing_id)
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
      where ml.id = substring(name from '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/')::uuid
        and ml.seller_profileid = (select auth.uid())
    )
  );

drop policy if exists "marketplace_listing_images_update_owner_path" on storage.objects;
create policy "marketplace_listing_images_update_owner_path"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'marketplace-listings'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$')
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = substring(name from '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/')::uuid
        and ml.seller_profileid = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'marketplace-listings'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$')
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = substring(name from '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/')::uuid
        and ml.seller_profileid = (select auth.uid())
    )
  );

drop policy if exists "marketplace_listing_images_delete_owner_path" on storage.objects;
create policy "marketplace_listing_images_delete_owner_path"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'marketplace-listings'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$')
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = substring(name from '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/')::uuid
        and ml.seller_profileid = (select auth.uid())
    )
  );

grant execute on function public.reorder_listing_media(uuid, uuid[]) to authenticated;
grant execute on function public.is_marketplace_listing_public_safe(uuid) to anon, authenticated;
grant execute on function public.is_marketplace_listing_sellable_by_owner(uuid, bigint) to authenticated;
revoke execute on function public.tg_marketplace_listings_touch_updated() from public, anon, authenticated;
revoke execute on function public.tg_listing_media_enforce_limit() from public, anon, authenticated;
revoke execute on function public.tg_listing_media_delete_storage_object() from public, anon, authenticated;
