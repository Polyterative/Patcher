-- First-party entity view tracking, read by the self-host Grafana only.
-- Plan: internaldocs/workflow/plans/entity-view-tracking.md
--
-- Additive only. The `analytics` schema is NOT in PostgREST's exposed schemas, so clients can only
-- write through public.track_views(); nobody but table owners and grafana_ro can read it.
-- No user id, IP or user agent is stored. The visitor hash uses a per-day random salt that is
-- deleted after two days, so hashes cannot be linked across days or reversed.
--
-- Kill switch (no release needed):
--   revoke execute on function public.track_views(text, jsonb) from anon, authenticated;
-- Rollback:
--   select cron.unschedule(jobid) from cron.job where jobname like 'analytics-view-%';
--   drop function if exists public.track_views(text, jsonb);
--   drop schema analytics cascade;

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

-- Readable names for Grafana; codes match the client (view-tracking.service.ts).
create table analytics.entity_types (
  code smallint primary key,
  name text not null unique
);

insert into analytics.entity_types (code, name) values
  (1, 'module'),
  (2, 'rack'),
  (3, 'patch'),
  (4, 'manufacturer'),
  (5, 'collection'),
  (9, 'page');

-- Raw views, kept 90 days. One row per visitor + entity per 30-minute bucket (dedupe index).
create table analytics.view_events (
  id bigint generated always as identity primary key,
  viewed_at timestamptz not null default now(),
  bucket timestamptz not null default date_bin('30 minutes', now(), timestamptz '2000-01-01 00:00:00+00'),
  entity_type smallint not null references analytics.entity_types (code),
  entity_id bigint not null default 0,
  route text not null default '',
  visitor_hash bytea not null,
  is_signed_in boolean not null,
  is_owner boolean not null default false,
  -- 0 direct, 1 internal navigation, 2 search engine, 3 other external site
  source smallint not null default 0,
  constraint view_events_entity_shape check (
    (entity_type = 9 and entity_id = 0 and route <> '' and length(route) <= 200)
    or (entity_type <> 9 and entity_id > 0 and route = '')
  ),
  constraint view_events_source check (source between 0 and 3)
);

create unique index view_events_dedupe_idx
  on analytics.view_events (visitor_hash, entity_type, entity_id, route, bucket);

-- Append-only and time-ordered: BRIN stays tiny and serves every time-range scan.
create index view_events_viewed_at_brin
  on analytics.view_events using brin (viewed_at);

-- Daily rollup, kept forever. Recomputed for the last two UTC days by pg_cron.
create table analytics.view_daily (
  day date not null,
  entity_type smallint not null references analytics.entity_types (code),
  entity_id bigint not null,
  route text not null,
  views integer not null,
  unique_visitors integer not null,
  signed_in_views integer not null,
  owner_views integer not null,
  search_views integer not null,
  external_views integer not null,
  primary key (day, entity_type, entity_id, route)
);

create index view_daily_entity_idx
  on analytics.view_daily (entity_type, entity_id, day);

create table analytics.visitor_salts (
  day date primary key,
  salt text not null default gen_random_uuid()::text
);

alter table analytics.entity_types enable row level security;
alter table analytics.view_events enable row level security;
alter table analytics.view_daily enable row level security;
alter table analytics.visitor_salts enable row level security;
revoke all on all tables in schema analytics from public, anon, authenticated;

-- Public write path. Never raises for bad input: tracking must not break pages.
-- p_visitor: random id the browser rotates daily. p_events: [{"t":1,"id":123,"s":1} | {"t":9,"r":"modules/browser","s":0}]
create or replace function public.track_views(p_visitor text, p_events jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ua text;
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_salt text;
  v_hash bytea;
  v_event jsonb;
  v_type smallint;
  v_id bigint;
  v_route text;
  v_source smallint;
  v_exists boolean;
  v_owner boolean;
begin
  if p_visitor is null or length(p_visitor) not between 8 and 64
     or p_events is null or jsonb_typeof(p_events) <> 'array' then
    return;
  end if;

  v_ua := lower(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''));
  if v_ua = '' or v_ua ~ '(bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|node-fetch|axios|go-http|java/|okhttp|postman)' then
    return;
  end if;

  insert into analytics.visitor_salts (day) values (v_day) on conflict (day) do nothing;
  select salt into v_salt from analytics.visitor_salts where day = v_day;
  v_hash := sha256(convert_to(p_visitor || ':' || v_salt, 'UTF8'));

  for v_event in select value from jsonb_array_elements(p_events) with ordinality as e(value, n) where n <= 25
  loop
    begin
      v_type := (v_event ->> 't')::smallint;
      v_source := coalesce((v_event ->> 's')::smallint, 0);
      if v_source not between 0 and 3 then
        v_source := 0;
      end if;
      v_owner := false;

      if v_type = 9 then
        v_route := left(coalesce(v_event ->> 'r', ''), 200);
        if v_route = '' or v_route !~ '^[A-Za-z0-9_:/.-]*$' then
          continue;
        end if;
        v_id := 0;
      else
        v_route := '';
        v_id := (v_event ->> 'id')::bigint;
        if v_id is null or v_id <= 0 then
          continue;
        end if;

        case v_type
          when 1 then
            select true, false into v_exists, v_owner from public.modules where id = v_id;
          when 2 then
            select true, coalesce(authorid = v_uid, false) into v_exists, v_owner from public.racks where id = v_id;
          when 3 then
            select true, coalesce(authorid = v_uid, false) into v_exists, v_owner from public.patches where id = v_id;
          when 4 then
            select true, false into v_exists, v_owner from public.manufacturers where id = v_id;
          when 5 then
            select true, coalesce(authorid = v_uid, false) into v_exists, v_owner from public.module_collections where id = v_id;
          else
            v_exists := false;
        end case;

        -- SELECT INTO sets the targets to null when the row does not exist.
        if not coalesce(v_exists, false) then
          continue;
        end if;
      end if;

      insert into analytics.view_events (entity_type, entity_id, route, visitor_hash, is_signed_in, is_owner, source)
      values (v_type, v_id, v_route, v_hash, v_uid is not null, coalesce(v_owner, false), v_source)
      on conflict do nothing;
    exception when others then
      -- Bad element (wrong types, unknown code): skip it, keep the rest.
      null;
    end;
  end loop;
end;
$$;

revoke all on function public.track_views(text, jsonb) from public;
grant execute on function public.track_views(text, jsonb) to anon, authenticated;

create or replace function analytics.rollup_view_daily(p_days integer default 2)
returns void
language sql
set search_path = ''
as $$
  insert into analytics.view_daily as d (
    day, entity_type, entity_id, route,
    views, unique_visitors, signed_in_views, owner_views, search_views, external_views
  )
  select
    (viewed_at at time zone 'utc')::date,
    entity_type,
    entity_id,
    route,
    count(*),
    count(distinct visitor_hash),
    count(*) filter (where is_signed_in),
    count(*) filter (where is_owner),
    count(*) filter (where source = 2),
    count(*) filter (where source in (2, 3))
  from analytics.view_events
  where viewed_at >= ((now() at time zone 'utc')::date - (greatest(p_days, 1) - 1)) at time zone 'utc'
  group by 1, 2, 3, 4
  on conflict (day, entity_type, entity_id, route) do update set
    views = excluded.views,
    unique_visitors = excluded.unique_visitors,
    signed_in_views = excluded.signed_in_views,
    owner_views = excluded.owner_views,
    search_views = excluded.search_views,
    external_views = excluded.external_views;
$$;

create or replace function analytics.prune_view_events()
returns void
language sql
set search_path = ''
as $$
  -- Make sure the days about to lose their raw rows are fully rolled up first.
  select analytics.rollup_view_daily(3);
  delete from analytics.view_events where viewed_at < now() - interval '90 days';
  delete from analytics.visitor_salts where day < (now() at time zone 'utc')::date - 1;
$$;

revoke all on function analytics.rollup_view_daily(integer) from public;
revoke all on function analytics.prune_view_events() from public;

do $$
declare
  existing_job record;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed: analytics rollup/prune jobs not scheduled';
    return;
  end if;

  for existing_job in
    select jobid from cron.job where jobname in ('analytics-view-rollup', 'analytics-view-prune')
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule('analytics-view-rollup', '*/10 * * * *', 'select analytics.rollup_view_daily(2)');
  perform cron.schedule('analytics-view-prune', '17 3 * * *', 'select analytics.prune_view_events()');
end;
$$;

-- Make PostgREST see track_views right away (harmless if the DDL watcher already did).
notify pgrst, 'reload schema';
