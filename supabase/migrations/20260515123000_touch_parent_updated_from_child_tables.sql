-- Touch parent racks.updated / patches.updated whenever a child row changes.
-- Fixes: moving modules inside a rack does not bump racks.updated (My Racks sort by updated DESC).
-- Same defect mirrored for patches: patch_connections and patch_module_instances writes.
--
-- See: internaldocs/workflow/TODO.md
--      "Bug — Moving Modules Inside a Rack Does Not Bump `updated` Timestamp"
--
-- Objects created:
--   function  public.tg_touch_rack_updated_from_rack_modules()
--   trigger   trg_touch_rack_updated_from_rack_modules  on rack_modules
--   function  public.tg_touch_patch_updated_from_patch_connections()
--   trigger   trg_touch_patch_updated_from_patch_connections  on patch_connections
--   function  public.tg_touch_patch_updated_from_patch_module_instances()
--   trigger   trg_touch_patch_updated_from_patch_module_instances  on patch_module_instances
--
-- FK columns verified via information_schema before applying:
--   rack_modules.rackid              (integer NOT NULL)
--   patch_connections.patchid        (integer NOT NULL)
--   patch_module_instances.patch_id  (bigint  NOT NULL)
--
-- Roll-forward only. Drop triggers/functions to revert.

-- ============================================================================
-- 1. rack_modules → racks
-- ============================================================================

create or replace function public.tg_touch_rack_updated_from_rack_modules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.racks
     set updated = now()
   where id = coalesce(NEW.rackid, OLD.rackid);
  return null;
end;
$$;

comment on function public.tg_touch_rack_updated_from_rack_modules() is
  'AFTER INSERT/UPDATE/DELETE trigger: bumps racks.updated whenever a rack_modules row changes. '
  'Ensures My Racks (sorted by updated DESC) surfaces racks whose modules were moved/added/removed.';

drop trigger if exists trg_touch_rack_updated_from_rack_modules on public.rack_modules;
create trigger trg_touch_rack_updated_from_rack_modules
  after insert or update or delete on public.rack_modules
  for each row execute function public.tg_touch_rack_updated_from_rack_modules();

-- ============================================================================
-- 2. patch_connections → patches
-- ============================================================================

create or replace function public.tg_touch_patch_updated_from_patch_connections()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.patches
     set updated = now()
   where id = coalesce(NEW.patchid, OLD.patchid);
  return null;
end;
$$;

comment on function public.tg_touch_patch_updated_from_patch_connections() is
  'AFTER INSERT/UPDATE/DELETE trigger: bumps patches.updated whenever a patch_connections row changes.';

drop trigger if exists trg_touch_patch_updated_from_patch_connections on public.patch_connections;
create trigger trg_touch_patch_updated_from_patch_connections
  after insert or update or delete on public.patch_connections
  for each row execute function public.tg_touch_patch_updated_from_patch_connections();

-- ============================================================================
-- 3. patch_module_instances → patches
-- ============================================================================

create or replace function public.tg_touch_patch_updated_from_patch_module_instances()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.patches
     set updated = now()
   where id = coalesce(NEW.patch_id, OLD.patch_id);
  return null;
end;
$$;

comment on function public.tg_touch_patch_updated_from_patch_module_instances() is
  'AFTER INSERT/UPDATE/DELETE trigger: bumps patches.updated whenever a patch_module_instances row changes.';

drop trigger if exists trg_touch_patch_updated_from_patch_module_instances on public.patch_module_instances;
create trigger trg_touch_patch_updated_from_patch_module_instances
  after insert or update or delete on public.patch_module_instances
  for each row execute function public.tg_touch_patch_updated_from_patch_module_instances();
