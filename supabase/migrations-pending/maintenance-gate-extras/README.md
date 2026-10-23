# Maintenance gate extras: pending migration (NOT applied, NOT in supabase/migrations)

Extends the base maintenance gate (`maintenance-gate/`, which provides `private.maint_ok()`) to the developer-API views and to public
storage buckets. Gate state: remote flag `maintenanceModeEnabled`, environment `production`, table `public.app_feature_flags`.

## What it does

1. API: restrictive policy `maint_gate_api` for roles `api_view_owner` and `api_reader` on `modules, manufacturers, module_ins,
   module_outs, module_panels, module_tags, tags, standards` (every table the `api_v1_*` views read). These roles carry no JWT, so
   `private.maint_ok()` is false while the flag is on and the views return no rows. `verify_api_key` is untouched. Admin API keys are
   not exempt at the database level: nothing unforgeable identifies them there, so the API is closed for everyone. Tables without RLS
   get a WARNING (the policy cannot gate them; the worker check still applies).
   `private.maint_flag_on()` (definer, executable by `api_reader`) lets the worker read the flag.
2. Buckets: public buckets among `home-resources, module-panels, patches, racks, manufacturer-logos, module-collections,
   marketplace-listings` are recorded in `private.maint_bucket_state` with their current `public` value. A trigger on
   `public.app_feature_flags` (`zz_maint_flag_changed`, fires for the production `maintenanceModeEnabled` row on insert/update/delete)
   sets `storage.buckets.public = false` while the flag is on and restores the recorded value otherwise. Only recorded buckets are touched.
   The migration applies the current flag state once at the end.
3. Objects: restrictive policy `maint_gate_objects` on `storage.objects` (anon/authenticated, recorded buckets only, admin passes via
   `private.maint_ok()`) and a permissive admin-only select policy `maint_admin_select_objects` on the same buckets (signed URL creation).
   If the migration role may not manage policies on `storage.objects` it prints a WARNING and skips this part; the bucket toggle still applies.
   If it cannot update `storage.buckets` the toggle and trigger are skipped with a WARNING.

## Apply order

1. `maintenance-gate/20261023120000_maintenance_gate.sql` (base, must already be applied)
2. `20261023130000_maintenance_gate_extras.sql` (this one). Check the WARNING lines in the output.
3. Deploy the two Cloudflare workers (`cloudflare/public-api`, `cloudflare/image-proxy`; see their READMEs).

Turn maintenance on/off: change the `maintenanceModeEnabled` production row in `app_feature_flags` as usual. Buckets follow the row
within the same statement; no other action needed. Rollback: `rollback/20261023130000_maintenance_gate_extras.rollback.sql`
(restores recorded bucket visibility exactly; safe to re-run). Re-running the migration keeps the first recorded values.

## Notes and risks

- After the first apply while the flag is on, buckets close immediately. Images already cached at the edge or in browsers are not
  affected by this migration alone (the image-proxy worker check handles the edge).
- Confirm on the live instance that the storage service honours a changed `storage.buckets.public` without restart.
- Admin images in the app use signed URLs while maintenance is on (frontend).

## Test

`PG_BIN=/opt/homebrew/opt/postgresql@17/bin LC_ALL=en_US.UTF-8 bash test/run.sh` (disposable cluster, or Docker if available).
The object-policy skip path (no ownership of `storage.objects`) is not covered by the harness because the throwaway superuser owns everything.
