-- Remote feature flags: lets the owner flip flags without a redeploy.
-- Additive; old clients never read it. Seeded from src/environments/features.json (insert only).
create table if not exists public.app_feature_flags (
  key text not null check (key ~ '^[a-zA-Z]+Enabled$'),
  environment text not null check (environment in ('production', 'development')),
  enabled boolean not null,
  updated timestamptz not null default now(),
  primary key (key, environment)
);

alter table public.app_feature_flags enable row level security;

drop policy if exists "app_feature_flags_select_all" on public.app_feature_flags;
create policy "app_feature_flags_select_all"
  on public.app_feature_flags
  for select
  to anon, authenticated
  using (true);

grant select on public.app_feature_flags to anon, authenticated;

insert into public.app_feature_flags (key, environment, enabled) values
  ('collectionsEnabled', 'production', false),
  ('coolReactionsEnabled', 'production', false),
  ('developerApiEnabled', 'production', true),
  ('modularGridImportEnabled', 'production', false),
  ('marketplaceEnabled', 'production', false),
  ('manufacturerInsightsEnabled', 'production', false),
  ('viewTrackingEnabled', 'production', true),
  ('readOnlyModeEnabled', 'production', true),
  ('collectionsEnabled', 'development', true),
  ('coolReactionsEnabled', 'development', true),
  ('developerApiEnabled', 'development', true),
  ('modularGridImportEnabled', 'development', false),
  ('marketplaceEnabled', 'development', true),
  ('manufacturerInsightsEnabled', 'development', true),
  ('viewTrackingEnabled', 'development', false),
  ('readOnlyModeEnabled', 'development', true)
on conflict (key, environment) do nothing;
