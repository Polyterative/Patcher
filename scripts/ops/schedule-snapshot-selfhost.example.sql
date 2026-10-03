-- EXAMPLE ONLY — NEVER RUN VERBATIM. DRAFT pending third backend-plan review.
--
-- Self-host rewrite of supabase/migrations/20260831175500_schedule_price_hub_snapshot_worker.sql
-- for the owner-present apply window (runbook §9.1). Checked-in migration still
-- points at the hosted functions URL and must not run verbatim on self-host.
--
-- PREREQUISITES (owner-run, server-side only, never in repo):
--   1. Extensions enabled on self-host: pg_cron + pg_net (same as hosted).
--   2. Vault secrets recreated server-side only:
--        price_hub_snapshot_token (cron Bearer; rotation coupled with runtime
--        PRICE_HUB_SNAPSHOT_TOKEN) AND api_key_pepper (carried verbatim;
--        rotation silently invalidates every external API key).
--   3. Edge Runtime disk-load of supabase/functions/snapshot-store-listings/ +
--      supabase/functions/_shared/ verbatim + runtime env in server .env only.
--   4. Replace <SELFHOST_FUNCTIONS_BASE> below:
--        staging test: http://SERVER-LAN-IP:8000
--        cutover:      https://<domain> (named tunnel/domain live first)
--   5. Same cadence: 0 0 */3 * * (every three days at 00:00 UTC).
--   6. Scheduler choice stays owner-gated (pg_cron recommended for parity —
--      same SQL, same cron.job_run_details history; host-cron rejected).
--
-- VERIFY (owner-run): cron.job row present, one manual net.http_post lands rows
-- with fresh observed_at, then cron.job_run_details shows the 3-day run green.

create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job record;
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'price_hub_snapshot_token'
  ) then
    raise exception 'Vault secret price_hub_snapshot_token must exist before scheduling the snapshot worker';
  end if;

  for existing_job in
    select jobid
    from cron.job
    where jobname = 'snapshot-store-listings-every-three-days'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'snapshot-store-listings-every-three-days',
    '0 0 */3 * *',
    $job$
      select net.http_post(
        url := '<SELFHOST_FUNCTIONS_BASE>/functions/v1/snapshot-store-listings?limit=20',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'price_hub_snapshot_token'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      ) as request_id;
    $job$
  );
end;
$$;
