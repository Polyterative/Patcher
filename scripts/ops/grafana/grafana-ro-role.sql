-- Read-only Postgres role for Grafana. SELF-HOST ONLY, never hosted.
-- Applied by `selfhost-grafana.sh role` (after owner approval) as supabase_admin with
--   psql -v pw=<generated on the NAS> -f this file
-- The password never appears in this file; it is passed as the psql variable :pw.
--
-- No writes, no policy / RLS / table changes. Idempotent (re-run rotates nothing but
-- re-asserts grants; pass a new :pw to rotate the password).
--
-- BYPASSRLS is needed because every source table has RLS on and no policy for a new
-- role, so without it every count would read 0. It only widens *which rows* the role
-- can see; WHAT it can read is limited by the column-level SELECT grants below
-- (no auth.users.encrypted_password or email, no IPs or user agents).
-- KNOWN GAP (verified 2026-10-07): cron.job and cron.job_run_details are already
-- SELECT-granted to PUBLIC by pg_cron, and BYPASSRLS skips pg_cron's per-user policy,
-- so grafana_ro (and any Grafana admin via Explore) CAN read cron.job.command, which for
-- the snapshot job holds a literal bearer token. The column grants on cron.* below do not
-- prevent that. Mitigation = treat the Grafana admin login as secret-holder, or rotate the
-- snapshot token / move it to Vault (owner decision, see checklist item 37).
BEGIN;

SELECT format('CREATE ROLE grafana_ro LOGIN BYPASSRLS PASSWORD %L CONNECTION LIMIT 5', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'grafana_ro') \gexec
SELECT format('ALTER ROLE grafana_ro LOGIN BYPASSRLS PASSWORD %L CONNECTION LIMIT 5', :'pw') \gexec

ALTER ROLE grafana_ro SET statement_timeout = '15s';
ALTER ROLE grafana_ro SET default_transaction_read_only = on;

-- DB size, connections, pg_stat_statements, pg_stat_* (read_all_stats + read_all_settings + stat_scan_tables)
GRANT pg_monitor TO grafana_ro;

GRANT USAGE ON SCHEMA auth, cron, public, extensions TO grafana_ro;  -- extensions: pg_stat_statements view

-- Auth: only the columns the dashboards use
GRANT SELECT (id, created_at, last_sign_in_at, deleted_at, is_anonymous) ON auth.users TO grafana_ro;
GRANT SELECT (id, user_id, created_at, updated_at, refreshed_at, not_after) ON auth.sessions TO grafana_ro;
GRANT SELECT (id, created_at, payload) ON auth.audit_log_entries TO grafana_ro;

-- Content growth
GRANT SELECT (id, created, public) ON public.modules TO grafana_ro;
GRANT SELECT (id, created, public, authorid) ON public.racks TO grafana_ro;
GRANT SELECT (id, created, public, authorid) ON public.patches TO grafana_ro;
GRANT SELECT (id, created_at) ON public.profiles TO grafana_ro;

-- pg_cron status (no command text)
GRANT SELECT (jobid, jobname, schedule, active) ON cron.job TO grafana_ro;
GRANT SELECT (jobid, runid, status, return_message, start_time, end_time) ON cron.job_run_details TO grafana_ro;

COMMIT;
