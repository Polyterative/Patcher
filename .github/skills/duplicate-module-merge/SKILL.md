---
name: duplicate-module-merge
description: Safe workflow for merging duplicate Patcher modules in Supabase. Use when the user asks to migrate, merge, consolidate, or delete duplicate modules by module ID, especially when rack placements, user ownership statuses, patch connections, panels, or tags may reference the duplicate. Requires read-only exploration first and explicit user confirmation before any write/delete.
---

# Duplicate Module Merge

Use this skill when handling duplicate rows in `public.modules`, for example:

- "merge module 1803 into 1896"
- "migrate racks/ownership from one duplicate module to another"
- "delete duplicate module after moving references"

See also: the app has a dev-utils "Merge into target module…" action on module detail pages for the safe common case
(`user_modules`, `module_tags`, and `rack_modules`, aborting on patch ports/instances). Use this skill for read-only
preflight, unusual references, and manual data operations.

Follow `AGENTS.md`: Supabase inspection is allowed, but **do not mutate data until the user explicitly confirms the exact migration/delete action**. Never apply migrations or RLS changes as part of this workflow.

## Terms

- **source module**: duplicate module to migrate away from and possibly delete later.
- **target module**: canonical module to keep.

Confirm the IDs before writes. Module detail URLs use the final path segment as the ID:

```text
http://localhost:5556/modules/details/1803 -> module id 1803
```

## Read-only preflight

1. Identify the active Patcher Supabase project with `supabase-list_projects`; use the active healthy project named `Patcher`.
2. Compare source/target module identity:

```sql
select id, name, "manufacturerId", hp, "standard", created, updated
from public.modules
where id in (:source_id, :target_id)
order by id;
```

3. Discover all direct foreign keys to `modules.id`:

```sql
select
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  tc.constraint_name,
  rc.update_rule,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'public'
  and ccu.table_name = 'modules'
  and ccu.column_name = 'id'
order by tc.table_name, kcu.column_name;
```

4. Count references for both IDs. Known module-reference tables include:

```sql
select
  'comments_duplicate' as table_name, 'moduleId' as column_name,
  count(*) filter (where "moduleId" = :source_id) as source_rows,
  count(*) filter (where "moduleId" = :target_id) as target_rows
from public.comments_duplicate
union all select 'module_flags','module_id', count(*) filter (where module_id = :source_id), count(*) filter (where module_id = :target_id) from public.module_flags
union all select 'module_ins','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.module_ins
union all select 'module_outs','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.module_outs
union all select 'module_panels','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.module_panels
union all select 'module_tags','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.module_tags
union all select 'patch_module_instances','module_id', count(*) filter (where module_id = :source_id), count(*) filter (where module_id = :target_id) from public.patch_module_instances
union all select 'patches_for_modules','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.patches_for_modules
union all select 'rack_modules','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.rack_modules
union all select 'user_modules','moduleid', count(*) filter (where moduleid = :source_id), count(*) filter (where moduleid = :target_id) from public.user_modules
order by table_name;
```

5. Inspect conflict risks before proposing writes:

```sql
select 'user_modules same profile' as conflict_type, count(*) as conflict_rows
from public.user_modules src
join public.user_modules tgt
  on tgt.profileid = src.profileid
 and tgt.moduleid = :target_id
where src.moduleid = :source_id
union all
select 'module_tags same tagid', count(*)
from public.module_tags src
join public.module_tags tgt
  on tgt.tagid = src.tagid
 and tgt.moduleid = :target_id
where src.moduleid = :source_id
union all
select 'rack_modules same rack/row/column', count(*)
from public.rack_modules src
join public.rack_modules tgt
  on tgt.rackid = src.rackid
 and tgt.row = src.row
 and tgt."column" = src."column"
 and tgt.moduleid = :target_id
where src.moduleid = :source_id
union all
select 'module_ins same name/range/flags', count(*)
from public.module_ins src
join public.module_ins tgt
  on tgt.moduleid = :target_id
 and tgt.name is not distinct from src.name
 and tgt.min is not distinct from src.min
 and tgt.max is not distinct from src.max
 and tgt."isDCC" is not distinct from src."isDCC"
 and tgt."isAudio" is not distinct from src."isAudio"
 and tgt."isVOCT" is not distinct from src."isVOCT"
where src.moduleid = :source_id
union all
select 'module_outs same name/range/flags', count(*)
from public.module_outs src
join public.module_outs tgt
  on tgt.moduleid = :target_id
 and tgt.name is not distinct from src.name
 and tgt.min is not distinct from src.min
 and tgt.max is not distinct from src.max
 and tgt."isDCC" is not distinct from src."isDCC"
 and tgt."isAudio" is not distinct from src."isAudio"
 and tgt."isVOCT" is not distinct from src."isVOCT"
where src.moduleid = :source_id;
```

6. If patch ports exist, inspect connector dependency tables before deleting anything:

```sql
select conrelid::regclass::text as table_name,
       conname as constraint_name,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in (
    'module_ins',
    'module_outs',
    'patch_module_instances',
    'patch_connections'
  )
order by table_name, contype, constraint_name;
```

7. Present a concise plan and wait for explicit confirmation.

## Confirmed migration pattern

For the common case where only rack placements and ownership must move, use a single statement with returning counts:

```sql
with
removed_duplicate_ownership as (
  delete from public.user_modules src
  using public.user_modules tgt
  where src.moduleid = :source_id
    and tgt.moduleid = :target_id
    and tgt.profileid = src.profileid
  returning src.profileid, src.kind
),
moved_ownership as (
  update public.user_modules
  set moduleid = :target_id
  where moduleid = :source_id
  returning profileid, kind
),
moved_rack_modules as (
  update public.rack_modules
  set moduleid = :target_id
  where moduleid = :source_id
  returning id, rackid, row, "column"
)
select
  (select count(*) from removed_duplicate_ownership) as duplicate_ownership_rows_removed,
  (select count(*) from moved_ownership) as ownership_rows_moved,
  (select count(*) from moved_rack_modules) as rack_module_rows_moved;
```

Notes:

- `user_modules` primary key is `(moduleid, profileid)`, not `(moduleid, profileid, kind)`. Remove same-profile duplicates before updating or the update can violate the primary key.
- `rack_modules` generally has no uniqueness constraint on module position, but still check same `rackid`/`row`/`column` conflicts before updating.
- `module_tags` often duplicate by `tagid`; if target already has the same tags, leave source tags for delete cascade.
- `module_panels` can be left for delete cascade when source panels are unused/unapproved. If rack rows use a source `selected_panel_id`, decide whether to move that panel to target or remap rack selections before deletion.
- `module_ins` and `module_outs` are dangerous because `patch_connections.a/b` reference their IDs with `ON DELETE CASCADE`. Do not delete a source module with source ports unless you have explicitly planned connector remapping or accepted cascade deletion.
- `patch_module_instances.module_id` has `ON DELETE RESTRICT`, so it will block source deletion until moved or removed.

## Verification

After writes, rerun the count query and explicitly confirm:

- `rack_modules` source rows are `0`
- `user_modules` source rows are `0`
- `patch_module_instances` source rows are `0` before deletion
- the source module still exists if the user has not confirmed deletion

Delete only after a separate explicit confirmation:

```sql
delete from public.modules
where id = :source_id
returning id, name;
```
