-- Secure Price Hub pilot tables after explicit user approval.
-- Public anon/authenticated clients may read; crawler writes must use service role.

create or replace function public.tg_price_hub_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.tg_price_hub_set_updated_at() is
  'BEFORE UPDATE trigger for Price Hub pilot tables with fixed search_path.';

alter table public.stores enable row level security;
alter table public.module_store_listings enable row level security;
alter table public.module_price_snapshots enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on public.stores,
     public.module_store_listings,
     public.module_price_snapshots
  from anon, authenticated;

grant select
  on public.stores,
     public.module_store_listings,
     public.module_price_snapshots
  to anon, authenticated;

grant select, insert, update, delete, truncate, references, trigger
  on public.stores,
     public.module_store_listings,
     public.module_price_snapshots
  to service_role;

grant usage, select
  on sequence public.stores_id_seq,
              public.module_store_listings_id_seq,
              public.module_price_snapshots_id_seq
  to service_role;

drop policy if exists "Price Hub stores are publicly readable" on public.stores;
create policy "Price Hub stores are publicly readable"
  on public.stores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Price Hub listings are publicly readable" on public.module_store_listings;
create policy "Price Hub listings are publicly readable"
  on public.module_store_listings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Price Hub snapshots are publicly readable" on public.module_price_snapshots;
create policy "Price Hub snapshots are publicly readable"
  on public.module_price_snapshots
  for select
  to anon, authenticated
  using (true);
