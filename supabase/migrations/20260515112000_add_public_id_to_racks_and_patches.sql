-- Add opaque public_id tokens to racks and patches so URLs are no longer enumerable by
-- sequential numeric ID. Also provide SECURITY DEFINER RPCs so anyone holding the full
-- ~71-bit token can read a row (even when private), without changing RLS on direct
-- table SELECTs.
--
-- See: internaldocs/workflow/CURRENT_FEATURE.md
--      "Opaque URL Tokens for Racks & Patches"
--
-- Roll-forward only. Reversal (drop columns / functions) is straightforward if needed.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. Token generator
-- ----------------------------------------------------------------------------
-- 12 random base64url characters → ~71 bits of entropy → 2.4e21 keyspace.
-- Brute-force infeasible; only the holder of the full token can hit a row.
-- ============================================================================

create or replace function public.generate_public_id(p_len int default 12)
returns text
language plpgsql
volatile
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

-- ============================================================================
-- 2. Schema: public_id columns + backfill + uniqueness + NOT NULL
-- ============================================================================

alter table public.racks   add column if not exists public_id text;
alter table public.patches add column if not exists public_id text;

-- Backfill existing rows. Loop guards against the (astronomical) collision case.
do $$
declare
  r record;
  candidate text;
begin
  for r in select id from public.racks where public_id is null loop
    loop
      candidate := public.generate_public_id();
      begin
        update public.racks set public_id = candidate where id = r.id;
        exit;
      exception when unique_violation then
        -- retry with fresh token
        null;
      end;
    end loop;
  end loop;

  for r in select id from public.patches where public_id is null loop
    loop
      candidate := public.generate_public_id();
      begin
        update public.patches set public_id = candidate where id = r.id;
        exit;
      exception when unique_violation then
        null;
      end;
    end loop;
  end loop;
end $$;

create unique index if not exists racks_public_id_uniq   on public.racks   (public_id);
create unique index if not exists patches_public_id_uniq on public.patches (public_id);

alter table public.racks   alter column public_id set not null;
alter table public.patches alter column public_id set not null;

-- ============================================================================
-- 3. BEFORE INSERT triggers so new rows get a token automatically
-- ============================================================================

create or replace function public.tg_set_public_id()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if NEW.public_id is null or NEW.public_id = '' then
    NEW.public_id := public.generate_public_id();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_racks_public_id on public.racks;
create trigger trg_racks_public_id
  before insert on public.racks
  for each row execute function public.tg_set_public_id();

drop trigger if exists trg_patches_public_id on public.patches;
create trigger trg_patches_public_id
  before insert on public.patches
  for each row execute function public.tg_set_public_id();

-- ============================================================================
-- 4. SECURITY DEFINER RPCs: read-by-token (bypasses RLS, returns one row)
-- ----------------------------------------------------------------------------
-- Anonymous viewers holding a full share token can read a row regardless of
-- the `public` flag. Editing still flows through normal RLS-protected paths.
-- Author profile is JSON-embedded to mirror the existing
-- `select=*,author:authorid(username,id)` shape used by the frontend.
-- ============================================================================

create or replace function public.get_rack_by_public_id(p_public_id text)
returns table (
  id           bigint,
  name         text,
  description  text,
  created      timestamp without time zone,
  updated      timestamp without time zone,
  authorid     uuid,
  public       boolean,
  hp           smallint,
  "rows"       smallint,
  locked       boolean,
  image        text,
  public_id    text,
  author       jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.description,
    r.created,
    r.updated,
    r.authorid,
    r.public,
    r.hp,
    r.rows,
    r.locked,
    r.image,
    r.public_id,
    jsonb_build_object('id', p.id, 'username', p.username) as author
  from public.racks r
  left join public.profiles p on p.id = r.authorid
  where r.public_id = p_public_id
  limit 1;
$$;

comment on function public.get_rack_by_public_id(text) is
  'Token-gated rack read. SECURITY DEFINER bypasses RLS so anonymous link-holders ' ||
  'can view even private racks. Only the holder of the full token can hit a row.';

create or replace function public.get_patch_by_public_id(p_public_id text)
returns table (
  id              bigint,
  name            text,
  description     character varying,
  created         timestamp without time zone,
  updated         timestamp without time zone,
  authorid        uuid,
  public          boolean,
  tags            text[],
  linked_rack_id  bigint,
  public_id       text,
  author          jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pt.id,
    pt.name,
    pt.description,
    pt.created,
    pt.updated,
    pt.authorid,
    pt.public,
    pt.tags,
    pt.linked_rack_id,
    pt.public_id,
    jsonb_build_object('id', pr.id, 'username', pr.username) as author
  from public.patches pt
  left join public.profiles pr on pr.id = pt.authorid
  where pt.public_id = p_public_id
  limit 1;
$$;

comment on function public.get_patch_by_public_id(text) is
  'Token-gated patch read. SECURITY DEFINER. See get_rack_by_public_id.';

-- ============================================================================
-- 5. Helper RPC: legacy numeric id → public_id (only for PUBLIC rows)
-- ----------------------------------------------------------------------------
-- Used by the frontend legacy redirect: old /racks/details/:id URLs are
-- translated to canonical /racks/:public_id, but ONLY when the rack is public.
-- Private legacy links 404 (intentional, per migration plan).
-- ============================================================================

create or replace function public.resolve_public_rack_legacy_id(p_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.public_id
  from public.racks r
  where r.id = p_id and r.public = true
  limit 1;
$$;

comment on function public.resolve_public_rack_legacy_id(bigint) is
  'Legacy redirect helper. Returns public_id only for PUBLIC racks. ' ||
  'Private rows yield NULL by design.';

create or replace function public.resolve_public_patch_legacy_id(p_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pt.public_id
  from public.patches pt
  where pt.id = p_id and pt.public = true
  limit 1;
$$;

comment on function public.resolve_public_patch_legacy_id(bigint) is
  'Legacy redirect helper. Returns public_id only for PUBLIC patches.';

-- ============================================================================
-- 6. Grants
-- ============================================================================

grant execute on function public.get_rack_by_public_id(text)            to anon, authenticated;
grant execute on function public.get_patch_by_public_id(text)           to anon, authenticated;
grant execute on function public.resolve_public_rack_legacy_id(bigint)  to anon, authenticated;
grant execute on function public.resolve_public_patch_legacy_id(bigint) to anon, authenticated;
