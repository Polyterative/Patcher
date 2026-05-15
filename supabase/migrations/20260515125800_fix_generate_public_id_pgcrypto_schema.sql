-- Fix generate_public_id() on Supabase projects where pgcrypto is installed in
-- the `extensions` schema. Upserts fire BEFORE INSERT triggers even when the
-- row conflicts and updates, so rack lock/unlock can call this generator.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_public_id(p_len int default 12)
returns text
language plpgsql
volatile
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
