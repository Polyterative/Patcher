-- Migration: rack_modules.orientation text -> smallint (0 normal, 1 rot180).
--
-- Scope: local authoring only. DO NOT apply remotely without the owner-present
-- operator window (GitHub issue #145). No RLS/policy/grant/storage change.
--
-- Preflight (internaldocs/patterns/BACKEND_METHODS.md):
-- - No UPDATE backfill: the USING conversion rewrites values inline without a
--   row-by-row UPDATE, so BEFORE UPDATE triggers (e.g.
--   trg_touch_rack_updated_from_rack_modules) do not fire and racks.updated /
--   rack_modules.updated are preserved.
-- - Unexpected values are rejected, not coerced: USING yields NULL for anything
--   outside ('normal', 'rot180'), and the subsequent SET NOT NULL fails loudly.
-- - Locking: ALTER COLUMN TYPE takes an ACCESS EXCLUSIVE lock and rewrites the
--   table. Check rack_modules size and active traffic before the operator apply.
-- - Rollback: ALTER COLUMN TYPE text USING (CASE 0 -> 'normal', 1 -> 'rot180'
--   END), then restore the text default and check constraint.
-- - Typegen + advisors + write-path numeric switch belong to the operator
--   window, after apply. Readers are already tolerant of both encodings.

alter table public.rack_modules
  alter column orientation drop default;

alter table public.rack_modules
  drop constraint if exists rack_modules_orientation_check;

alter table public.rack_modules
  alter column orientation type smallint using (
    case orientation
      when 'normal' then 0
      when 'rot180' then 1
    end
  );

alter table public.rack_modules
  alter column orientation set not null,
  alter column orientation set default 0;

alter table public.rack_modules
  add constraint rack_modules_orientation_check check (orientation in (0, 1));

comment on column public.rack_modules.orientation is
  'Placement-level module orientation as smallint. 0 is normal (default); 1 flips eligible 3U placements 180 degrees; 2+ reserved for reviewed future states. The app translates to semantic names at the Supabase boundary.';
