-- Manual snippet (NOT a migration, never auto-applied). Run by the owner in the SQL editor.
-- Adds the remote `maintenanceModeEnabled` flag (additive; old clients ignore unknown keys).

insert into public.app_feature_flags (key, environment, enabled) values
  ('maintenanceModeEnabled', 'production', false),
  ('maintenanceModeEnabled', 'development', false)
on conflict (key, environment) do nothing;

-- Turn maintenance mode ON (production):
-- update public.app_feature_flags set enabled = true, updated = now()
--  where key = 'maintenanceModeEnabled' and environment = 'production';

-- Turn maintenance mode OFF (production):
-- update public.app_feature_flags set enabled = false, updated = now()
--  where key = 'maintenanceModeEnabled' and environment = 'production';
