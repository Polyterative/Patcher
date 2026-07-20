create table if not exists public.shipping_addresses (
  id uuid primary key default extensions.gen_random_uuid(),
  profileid uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  line1 text not null,
  line2 text null,
  city text not null,
  region text null,
  postal_code text null,
  country_code text not null,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint shipping_addresses_label_not_blank check (length(btrim(label)) > 0),
  constraint shipping_addresses_recipient_name_not_blank check (length(btrim(recipient_name)) > 0),
  constraint shipping_addresses_line1_not_blank check (length(btrim(line1)) > 0),
  constraint shipping_addresses_city_not_blank check (length(btrim(city)) > 0),
  constraint shipping_addresses_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint shipping_addresses_label_length check (char_length(label) <= 80),
  constraint shipping_addresses_recipient_name_length check (char_length(recipient_name) <= 160),
  constraint shipping_addresses_line1_length check (char_length(line1) <= 255),
  constraint shipping_addresses_line2_length check (line2 is null or char_length(line2) <= 255),
  constraint shipping_addresses_city_length check (char_length(city) <= 160),
  constraint shipping_addresses_region_length check (region is null or char_length(region) <= 160),
  constraint shipping_addresses_postal_code_length check (postal_code is null or char_length(postal_code) <= 32)
);

alter table public.shipping_addresses enable row level security;

revoke all on table public.shipping_addresses from anon, authenticated;
grant select, insert, update, delete on table public.shipping_addresses to authenticated;

create index if not exists shipping_addresses_owner_order_idx
  on public.shipping_addresses (profileid, is_default desc, created_at desc, id);

create unique index if not exists shipping_addresses_one_default_per_owner_idx
  on public.shipping_addresses (profileid)
  where is_default = true;

create or replace function public.tg_shipping_addresses_single_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();

  if new.is_default is true then
    update public.shipping_addresses
    set is_default = false
    where profileid = new.profileid
      and id is distinct from new.id
      and is_default = true;
  end if;

  return new;
end;
$$;

comment on function public.tg_shipping_addresses_single_default() is
  'Maintains updated_at and clears a user''s previous default shipping address before a new default is saved.';

drop trigger if exists trg_shipping_addresses_single_default on public.shipping_addresses;
create trigger trg_shipping_addresses_single_default
  before insert or update on public.shipping_addresses
  for each row execute function public.tg_shipping_addresses_single_default();

drop policy if exists "shipping_addresses_select_own" on public.shipping_addresses;
create policy "shipping_addresses_select_own"
  on public.shipping_addresses
  for select
  to authenticated
  using ((select auth.uid()) = profileid);

drop policy if exists "shipping_addresses_insert_own" on public.shipping_addresses;
create policy "shipping_addresses_insert_own"
  on public.shipping_addresses
  for insert
  to authenticated
  with check ((select auth.uid()) = profileid);

drop policy if exists "shipping_addresses_update_own" on public.shipping_addresses;
create policy "shipping_addresses_update_own"
  on public.shipping_addresses
  for update
  to authenticated
  using ((select auth.uid()) = profileid)
  with check ((select auth.uid()) = profileid);

drop policy if exists "shipping_addresses_delete_own" on public.shipping_addresses;
create policy "shipping_addresses_delete_own"
  on public.shipping_addresses
  for delete
  to authenticated
  using ((select auth.uid()) = profileid);
