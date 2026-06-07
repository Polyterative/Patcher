<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Bug — Moving Modules Inside a Rack Does Not Bump `updated` Timestamp

**Why:** Moving modules on the rack canvas does NOT update `racks.updated`, so the edited
rack doesn't jump to the top of the "My Racks" list (sorted by `updated DESC`).

**Investigation completed 15-05-2026 (confidence: HIGH, root cause confirmed in code):**

- "My Racks" query at `src/app/features/backend/supabase-queries.ts:735-745` orders by
  `updated DESC` — correct sort field.
- Module move/reorder save path: `rack-detail-data.service.ts:953-961` →
  `backend.update.rackedModules(...)` → `supabase-update.ts:100-134` writes **only**
  `rack_modules` rows and busts `rackWithId` cache. **No write to parent `racks` row.**
- Rack metadata edits (rename, privacy, row count) DO write the parent `racks` row through
  `update.rack(...)` in `supabase-update.ts:148-167` → those correctly bump `racks.updated`
  (via the existing BEFORE UPDATE timestamp trigger).
- **Same defect exists for patches:** `patch-detail-data.service.ts:636-660` →
  `update.patchConnectionsSilent(...)` → only writes `patch_connections`, never touches the
  parent `patches` row.

**Recommended fix (Option A preferred — DB trigger, needs explicit user approval):**

Add a trigger on `rack_modules` and `patch_connections` (and likely
`patch_module_instances` if it exists) that bumps the parent row's `updated` on any
INSERT/UPDATE/DELETE:

```sql
create or replace function public.touch_rack_updated_from_rack_modules()
returns trigger language plpgsql as $$
begin
  update public.racks set updated = now()
    where id = coalesce(new.rackid, old.rackid);
  return null;
end; $$;

create trigger trg_touch_rack_updated_from_rack_modules
after insert or update or delete on public.rack_modules
for each row execute function public.touch_rack_updated_from_rack_modules();
```

(Mirror for patches; pick correct FK column names from schema.)

**Trade-off:** Option A covers any writer (current and future). Option B (frontend-only — add
an `update.rack({ updated: now })` touch after `update.rackedModules`) is faster to ship but
leaves the data invariant unenforced.

**Implementation (next agent):**

- [x] Ask user for explicit approval on the DB trigger (Option A) or pick Option B.
- [x] Apply chosen fix. If trigger: log the migration under the schema-change preflight
      checklist in `internaldocs/patterns/BACKEND_METHODS.md`.
- [x] Add a unit test: "moving a module updates the rack's last-modified timestamp" — assert
      `backend.update.rackedModules` is called; deeper updated-timestamp verification requires live DB integration test.
- [x] Repeat for patches' connections / instances flows.

**Fixed via DB triggers on `rack_modules` (and patches equivalent) — see migration `20260515123000_touch_parent_updated_from_child_tables.sql`. Applied 2026-05-15.**

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

