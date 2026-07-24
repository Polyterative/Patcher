-- Local-only Public Open API role foundation.
-- Credentials are intentionally not created here; api_reader remains NOLOGIN until a separately approved runbook step.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'api_view_owner') then
    create role api_view_owner nologin;
  else
    alter role api_view_owner nologin;
  end if;

  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'api_reader') then
    create role api_reader nologin;
  else
    alter role api_reader nologin;
  end if;
end
$$;

grant usage on schema public to api_view_owner;
grant usage on schema public to api_reader;
grant api_view_owner to postgres with admin option;

comment on role api_view_owner is
  'NOLOGIN owner for Public Open API security-barrier views; receives only narrow base-column grants.';
comment on role api_reader is
  'NOLOGIN Public Open API runtime reader role; credential provisioning is separately gated outside migrations.';
