-- Allow public_id generation to call pgcrypto from Supabase's `extensions`
-- schema without requiring app roles to have USAGE on that schema.

create or replace function public.generate_public_id(p_len int default 12)
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  bytes_needed int;
  raw text;
begin
  -- base64 emits 4 chars per 3 bytes; ceil to cover the requested length.
  bytes_needed := ceil(p_len::numeric * 3 / 4)::int;
  raw := translate(encode(extensions.gen_random_bytes(bytes_needed), 'base64'), '+/=', '-_');
  return substr(raw, 1, p_len);
end;
$$;

comment on function public.generate_public_id(int) is
  '12-char base64url opaque ID for racks/patches URLs. ~71 bits entropy.';

create or replace function public.tg_set_public_id()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if NEW.public_id is null or NEW.public_id = '' then
    NEW.public_id := public.generate_public_id();
  end if;
  return NEW;
end;
$$;
