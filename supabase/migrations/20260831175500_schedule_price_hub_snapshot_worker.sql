-- Run the bounded Price Hub snapshot worker every three days at 00:00 UTC.
-- The worker token is stored in Supabase Vault and is never embedded in SQL.

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
        url := 'https://sozmatmywjpstwidzlss.supabase.co/functions/v1/snapshot-store-listings?limit=20',
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
