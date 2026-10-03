-- Minimal Supabase platform stubs so a hosted `public` schema dump loads into a
-- plain local Postgres for drills. Not a Supabase emulation: just the roles,
-- schemas, functions and auth tables the dump references, shaped like GoTrue's
-- (incl. generated columns, which sync tooling must exclude from COPY lists).

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator;
CREATE ROLE supabase_admin NOLOGIN SUPERUSER;
CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE ROLE supabase_storage_admin NOLOGIN;
CREATE ROLE api_view_owner NOLOGIN;
CREATE ROLE api_reader NOLOGIN;

CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION moddatetime WITH SCHEMA extensions;
CREATE SCHEMA private;
CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
  $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

CREATE TABLE auth.users (
  instance_id uuid,
  id uuid PRIMARY KEY,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  phone text,
  phone_confirmed_at timestamptz,
  confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_sso_user boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
CREATE TABLE auth.identities (
  provider_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text GENERATED ALWAYS AS (lower(identity_data ->> 'email')) STORED,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  UNIQUE (provider_id, provider)
);
ALTER TABLE auth.users OWNER TO supabase_auth_admin;
ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

CREATE FUNCTION private.is_marketplace_listing_public_safe(p_listing_id uuid)
  RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
CREATE FUNCTION private.is_marketplace_listing_sellable_by_owner(p_seller_profileid uuid, p_moduleid bigint)
  RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
CREATE FUNCTION private.mint_api_key(uuid, text, text)
  RETURNS text LANGUAGE sql AS $$ SELECT 'drill'::text $$;

-- The dump recreates schema public itself.
DROP SCHEMA public CASCADE;
