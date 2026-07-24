-- Public Open API key identity, usage accounting, and RPC boundary.
-- This migration creates no Vault secret and grants no direct api_reader table access.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.api_tiers (
  code text primary key,
  monthly_quota integer not null,
  per_minute_quota integer not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint api_tiers_code_check check (code ~ '^[a-z_]+$'),
  constraint api_tiers_monthly_quota_positive check (monthly_quota > 0),
  constraint api_tiers_per_minute_quota_positive check (per_minute_quota > 0)
);

insert into public.api_tiers (code, monthly_quota, per_minute_quota, description)
values
  ('free', 5000, 60, 'Self-service Public Open API tier.'),
  ('partner', 500000, 600, 'Manually provisioned partner Public Open API tier.')
on conflict (code) do nothing;

create table if not exists public.api_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  key_prefix text not null,
  key_hash bytea not null,
  tier_code text not null references public.api_tiers(code),
  monthly_quota_override integer null,
  per_minute_quota_override integer null,
  label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null,
  last_used_at timestamptz null,
  constraint api_keys_monthly_quota_override_positive check (monthly_quota_override is null or monthly_quota_override > 0),
  constraint api_keys_per_minute_quota_override_positive check (per_minute_quota_override is null or per_minute_quota_override > 0)
);

create unique index if not exists api_keys_key_hash_uniq
  on public.api_keys (key_hash);

create index if not exists api_keys_active_profile_idx
  on public.api_keys (profile_id)
  where revoked_at is null;

create table if not exists public.api_key_usage_monthly (
  key_id uuid not null references public.api_keys(id) on delete cascade,
  month date not null,
  used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (key_id, month),
  constraint api_key_usage_monthly_used_nonnegative check (used >= 0),
  constraint api_key_usage_monthly_month_first_check check (month = date_trunc('month', month)::date)
);

alter table public.api_tiers owner to postgres;
alter table public.api_keys owner to postgres;
alter table public.api_key_usage_monthly owner to postgres;

alter table public.api_keys enable row level security;
alter table public.api_key_usage_monthly enable row level security;

revoke all on table public.api_tiers from anon, authenticated, api_reader;
revoke all on table public.api_keys from anon, authenticated, api_reader;
revoke all on table public.api_key_usage_monthly from anon, authenticated, api_reader;
grant select on table public.api_keys to authenticated;
grant select on table public.api_key_usage_monthly to authenticated;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own"
  on public.api_keys
  as permissive
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "api_keys_select_admin" on public.api_keys;
create policy "api_keys_select_admin"
  on public.api_keys
  as permissive
  for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "api_key_usage_monthly_select_own" on public.api_key_usage_monthly;
create policy "api_key_usage_monthly_select_own"
  on public.api_key_usage_monthly
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.api_keys k
      where k.id = key_id
        and k.profile_id = auth.uid()
    )
  );

drop policy if exists "api_key_usage_monthly_select_admin" on public.api_key_usage_monthly;
create policy "api_key_usage_monthly_select_admin"
  on public.api_key_usage_monthly
  as permissive
  for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create or replace function private.mint_api_key(
  p_profile_id uuid,
  p_tier_code text,
  p_label text
)
returns table (id uuid, raw_key text, prefix text, tier text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
declare
  v_secret_count integer;
  v_pepper_text text;
  v_pepper_bytes bytea;
  v_raw_bytes bytea;
  v_suffix text;
  v_wire_key text;
  v_prefix text;
  v_key_hash bytea;
  v_key_id uuid;
begin
  if p_profile_id is null then
    raise exception 'profile id is required' using errcode = '23502';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_profile_id) then
    raise exception 'profile % does not exist', p_profile_id using errcode = '23503';
  end if;

  if not exists (select 1 from public.api_tiers t where t.code = p_tier_code) then
    raise exception 'api tier % does not exist', p_tier_code using errcode = '23503';
  end if;

  select count(*)::integer, max(ds.decrypted_secret)
    into v_secret_count, v_pepper_text
  from vault.decrypted_secrets ds
  where ds.name = 'api_key_pepper';

  if v_secret_count = 0 then
    raise exception 'Vault secret api_key_pepper is missing' using errcode = 'P0001';
  elsif v_secret_count > 1 then
    raise exception 'Vault secret api_key_pepper is duplicated' using errcode = 'P0001';
  end if;

  begin
    v_pepper_bytes := decode(v_pepper_text, 'base64');
  exception when others then
    raise exception 'Vault secret api_key_pepper must be base64 text' using errcode = '22023';
  end;

  if octet_length(v_pepper_bytes) <> 32 then
    raise exception 'Vault secret api_key_pepper must decode to 32 bytes' using errcode = '22023';
  end if;

  v_raw_bytes := extensions.gen_random_bytes(16);
  v_suffix := translate(rtrim(encode(v_raw_bytes, 'base64'), '='), '+/', '-_');

  if length(v_suffix) <> 22 then
    raise exception 'generated api key suffix has invalid length' using errcode = '22023';
  end if;

  v_wire_key := 'pk_live_' || v_suffix;
  v_prefix := left(v_wire_key, 15);
  v_key_hash := extensions.hmac(v_raw_bytes, v_pepper_bytes, 'sha256');

  insert into public.api_keys (profile_id, key_prefix, key_hash, tier_code, label)
  values (p_profile_id, v_prefix, v_key_hash, p_tier_code, nullif(btrim(p_label), ''))
  returning api_keys.id into v_key_id;

  return query select v_key_id, v_wire_key, v_prefix, p_tier_code;
exception
  when unique_violation then
    raise exception 'duplicate api key digest; retry key creation' using errcode = '23505';
end;
$$;

create or replace function public.create_api_key(p_label text)
returns table (id uuid, raw_key text, prefix text, tier text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := auth.uid();

  if v_profile_id is null then
    raise exception 'authentication is required to create an API key' using errcode = '28000';
  end if;

  return query
    select * from private.mint_api_key(v_profile_id, 'free', p_label);
end;
$$;

create or replace function public.create_partner_api_key(
  p_profile_id uuid,
  p_label text
)
returns table (id uuid, raw_key text, prefix text, tier text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'partner API key creation requires administrative context' using errcode = '42501';
  end if;

  if session_user <> 'postgres' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'partner API key creation requires administrative context' using errcode = '42501';
  end if;

  return query
    select * from private.mint_api_key(p_profile_id, 'partner', p_label);
end;
$$;

create or replace function public.revoke_api_key(p_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication is required to revoke an API key' using errcode = '28000';
  end if;

  select k.profile_id
    into v_profile_id
  from public.api_keys k
  where k.id = p_id;

  if not found then
    raise exception 'api key not found' using errcode = 'P0002';
  end if;

  if v_profile_id <> auth.uid()
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'not authorized to revoke this api key' using errcode = '42501';
  end if;

  update public.api_keys
  set
    revoked_at = coalesce(revoked_at, now()),
    updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.verify_api_key(p_hash bytea)
returns table (
  id uuid,
  profile_id uuid,
  tier_code text,
  monthly_quota integer,
  per_minute_quota integer
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    k.id,
    k.profile_id,
    k.tier_code,
    coalesce(k.monthly_quota_override, t.monthly_quota) as monthly_quota,
    coalesce(k.per_minute_quota_override, t.per_minute_quota) as per_minute_quota
  from public.api_keys k
  join public.api_tiers t on t.code = k.tier_code
  where k.key_hash = p_hash
    and k.revoked_at is null;
$$;

create or replace function public.record_api_key_usage(
  p_key_id uuid,
  p_month date,
  p_used integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_used is null or p_used < 0 then
    raise exception 'api key usage must be nonnegative' using errcode = '22023';
  end if;

  if p_month is null or p_month <> date_trunc('month', p_month)::date then
    raise exception 'api key usage month must be the first day of a month' using errcode = '22023';
  end if;

  insert into public.api_key_usage_monthly (key_id, month, used, updated_at)
  values (p_key_id, p_month, p_used, now())
  on conflict (key_id, month) do update
  set
    used = greatest(excluded.used, public.api_key_usage_monthly.used),
    updated_at = now();

  update public.api_keys
  set
    last_used_at = greatest(coalesce(last_used_at, '-infinity'::timestamptz), now()),
    updated_at = now()
  where id = p_key_id;
end;
$$;

alter function private.mint_api_key(uuid, text, text) owner to postgres;
alter function public.create_api_key(text) owner to postgres;
alter function public.create_partner_api_key(uuid, text) owner to postgres;
alter function public.revoke_api_key(uuid) owner to postgres;
alter function public.verify_api_key(bytea) owner to postgres;
alter function public.record_api_key_usage(uuid, date, integer) owner to postgres;

revoke all on function private.mint_api_key(uuid, text, text) from public, anon, authenticated, api_reader;
revoke all on function public.create_api_key(text) from public, anon, authenticated, api_reader;
revoke all on function public.create_partner_api_key(uuid, text) from public, anon, authenticated, api_reader;
revoke all on function public.revoke_api_key(uuid) from public, anon, authenticated, api_reader;
revoke all on function public.verify_api_key(bytea) from public, anon, authenticated, api_reader;
revoke all on function public.record_api_key_usage(uuid, date, integer) from public, anon, authenticated, api_reader;

grant execute on function public.create_api_key(text) to authenticated;
grant execute on function public.create_partner_api_key(uuid, text) to service_role;
grant execute on function public.revoke_api_key(uuid) to authenticated;
grant execute on function public.verify_api_key(bytea) to api_reader;
grant execute on function public.record_api_key_usage(uuid, date, integer) to api_reader;

comment on function private.mint_api_key(uuid, text, text) is
  'Private Public Open API key minting helper. Reads api_key_pepper from Vault, returns raw key once, and has no caller grants.';
comment on function public.create_api_key(text) is
  'Authenticated self-service Public Open API key creation. Always mints the free tier for auth.uid().';
comment on function public.create_partner_api_key(uuid, text) is
  'Administrative Public Open API partner-key creation. EXECUTE is granted only to service_role; postgres can run directly.';
comment on function public.verify_api_key(bytea) is
  'api_reader-only active-key verification returning effective quota limits.';
comment on function public.record_api_key_usage(uuid, date, integer) is
  'api_reader-only monotonic monthly usage reporter; direct table writes remain ungranted.';
