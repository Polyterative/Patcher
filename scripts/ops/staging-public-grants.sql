-- Staging grant baseline for a freshly restored self-hosted database.
--
-- WHY THIS EXISTS: `pg_dump --schema-only` carries table/policies/functions
-- but NO table GRANTs and NO default privileges, so a restored database
-- answers every API table read with 403 until these run. This file mirrors
-- the hosted Supabase default posture (roles can reach tables; Row Level
-- Security policies remain the real gate for anon/authenticated).
--
-- SCOPE: self-hosted STAGING restores only. Never apply to hosted production
-- (hosted already has its grants; this would be a no-op at best).
-- NEVER use as the cutover/prod grant step: the blanket ALL below would hand
-- EXECUTE on private.mint_api_key / verify_api_key / record_api_key_usage to
-- anon+authenticated, undoing the least-privilege revokes in
-- 20260724133200_api_identity.sql:344-355. Prod replays captured hosted
-- GRANTs/default-privs verbatim with an api_reader-only audit
-- (re-review BLOCK 2026-10-03).
--
-- APPLY (from repo root, self-host target only — the restore script refuses
-- hosted-looking targets and requires explicit confirmation):
--   TARGET_DB_URL="postgresql://..." bash scripts/ops/restore-data.sh scripts/ops/staging-public-grants.sql
-- Or peer-auth on the server with no password involved:
--   docker exec -i -u postgres supabase-db psql -v ON_ERROR_STOP=1 < scripts/ops/staging-public-grants.sql
--
-- VERIFY: anon-key table read returns rows (not 401/403); service root 200.

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
