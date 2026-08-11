# Cache Strategy

> Audited: 14-05-2026. Re-audit whenever a new GET or write method is added to any supabase-* namespace file.

---

## Overview

Client-side caching is handled by the `ts-cacheable` library via `@Cacheable` decorators on methods in
`SupabaseQueriesService` (`supabase-queries.ts`). Invalidation is driven by a single global
`cacheBuster$: Subject<CachedEntity[]>` exported from `supabase.cache.ts`. Write methods in
`supabase-add.ts`, `supabase-update.ts`, and `supabase-delete.ts` emit to this subject using the
`cacheBust(keys[])` operator after a successful mutation.

Cache lives in `LocalStorage` (browser) or `InMemoryStorage` (SSR/test).

---

## Cache Times

| Constant         | Value         | Use case                                        |
|------------------|---------------|-------------------------------------------------|
| `smallCacheTime` | 1 minute      | Frequently updated lists (modules search)       |
| `defaultCacheTime` | 5 minutes   | Most entity reads                               |
| `longCacheTime`  | 50 minutes    | Rarely changing data (tags, manufacturer list)  |

---

## Cache Key Inventory

Every `CachedEntity` key, its producer(s), and which write operations bust it:

| Cache key               | Cached by (method)                                               | Busted by (operations)                                                                    |
|-------------------------|------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `modules`               | `getModules`, `getApplicationModuleInsights`                     | `add.modules`, `add.moduleTagLink`, `update.module`, `update.modules`, `update.moduleStoreUrl`, `update.moduleINsOUTs`, `delete.module`, `delete.modules`, `delete.allUserData` |
| `moduleWithId`          | `getModuleWithId`                                               | `add.modules`, `add.moduleTagLink`, `update.module`, `update.modules`, `update.moduleStoreUrl`, `update.moduleINsOUTs`, `delete.module`, `delete.modules`, `delete.allUserData` |
| `currentUserModules`    | `getCurrentUserModules`                                         | `add.userModule`, `add.modules`, `update.module`, `update.modules`, `update.moduleStoreUrl`, `update.moduleINsOUTs`, `delete.userModule`, `delete.module`, `delete.modules`, `delete.allUserData` |
| `manufacturers`         | `getManufacturers`, `getManufacturersPaginated`                 | `add.manufacturers`, `delete.manufacturers`, `delete.manufacturer`                        |
| `patches`               | `getPatches`, `getCurrentUserPatchesForAuthor`, `getUserPatchesPaginated`, `getPublicUserPatchesPaginated`, `getPublicPatchWithId` | `add.patch`, `update.patch`, `update.patchSilent`, `update.patchConnections`, `update.patchConnectionsSilent`, `update.patchTags`, `delete.patch`, `delete.patchConnectionsForPatch`, `delete.userPatch`, `delete.allUserData` |
| `patchConnections`      | `getPatchConnections`                                           | `add.patchModuleInstance`, `add.patchModuleInstances`, `update.patchConnections`, `update.patchConnectionsSilent`, `update.patchConnectionNoteSilent`, `update.patchModuleInstanceLabel`, `update.patch`, `update.patchSilent`, `delete.patch`, `delete.patchConnectionsForPatch`, `delete.patchModuleInstance`, `delete.patchModuleInstancesForPatch`, `delete.userPatch`, `delete.allUserData` |
| `patchModuleInstances`  | `getPatchModuleInstances`                                       | `add.patchModuleInstance`, `add.patchModuleInstances`, `update.patchModuleInstanceLabel`, `delete.patch`, `delete.patchModuleInstance`, `delete.patchModuleInstancesForPatch`, `delete.userPatch`, `delete.allUserData` |
| `rackWithId`            | `getRackWithId`, `getPublicRackWithId`, `getUserRacksPaginated`, `getPublicUserRacksPaginated` | `add.rack`, `add.rackModule`, `update.rack`, `update.rackedModules`, `update.rackModulePanel`, `delete.userRack`, `delete.rackedModule`, `delete.modulesOfRack`, `delete.allUserData` |
| `racksMinimal`          | `getRacksMinimal`                                               | `add.rack`, `update.rack`, `delete.userRack`, `delete.allUserData`                       |
| `comments`              | `getComments`                                                   | `add.comment`, `delete.comment`, `delete.commentsForRack`, `delete.allUserData`           |
| `currentUserComments`   | `getCurrentUserComments`                                        | `add.comment`, `delete.comment`, `delete.commentsForRack`, `delete.userModule`, `delete.module`, `delete.allUserData` |
| `userModuleTags`        | `getMyVotes`                                                    | `add.userModuleTag`, `delete.userModuleTag`                                               |
| `standards`             | `getStandards` (`SupabaseManufacturerQueries`)                  | No write path touches the `standards` table today; `cacheBusterObserver` wired for forward-compatibility only |
| `appStatistics`         | `getStatistics` (`SupabaseApplicationStatisticsQueries`)        | n/a (TTL-only decay, read-only aggregate counts, matches documented design) |
| `module_flags`          | *(declared in CachedEntity but no @Cacheable exists yet)*       | n/a — admin-only surface, acceptable to load fresh each time                              |
| `profiles`              | *(declared in CachedEntity; used only as a bust signal)*        | No direct @Cacheable method for profiles; busts `getRacksMinimal`, `getPublicUserRacksPaginated`, `getPublicUserPatchesPaginated`, `getPublicUserContributorStats` when profile changes |
| `void`                  | *(wildcard — any/all keys)*                                     | Not currently emitted by any operation                                                    |

---

## Uncached Reads (intentional)

These methods in `supabase-get.ts` do NOT use `@Cacheable`. They load fresh data on every call.
This is appropriate for the use cases listed:

| Method                          | Reason not cached                                                              |
|---------------------------------|--------------------------------------------------------------------------------|
| `get.rackedModules(rackId)`     | Called only from the rack editor on open; always needs fresh layout data       |
| `get.racksWithModule(moduleId)` | Paginated browse result; parameters vary; acceptable to load fresh             |
| `get.patchWithId(id)`           | Loaded inside the patch editor; editor owns the live state                     |
| `get.patchesWithModule(id)`     | Paginated browse result                                                        |
| `get.moduleUsageSummary(id)`    | RPC aggregate; low-frequency read, negligible cost                             |
| `get.modulesBySameManufacturer` | Paginated; varies by manufacturer + range                                      |
| `get.manufacturerWithId(id)`    | Low-frequency; called once per detail page load                                |
| `get.userWithId(id)`            | Auth-scoped; must be fresh after profile edits                                 |
| `get.publicProfileByUsername`   | Low-frequency public profile load                                              |
| `get.tagVotesForModule`         | Vote counts change frequently; stale data misleads users                       |
| `get.moduleFlagCount(id)`       | Admin/report surface; needs to be current                                      |
| `get.allModuleFlags()`          | Admin list; must be fresh                                                      |

---

## Caching Candidates (implemented)

`get.standards()` and `get.statistics()` were the two LOW-priority candidates previously
listed here — both are now implemented (see Cache Key Inventory above). No further
candidates are currently identified; re-audit whenever a new GET method is added.

---

## Audit Findings & Fixes Applied (14-05-2026)

The following cache invalidation gaps were found and fixed in this session:

| Operation               | Before              | After                             | Impact                                      |
|-------------------------|---------------------|-----------------------------------|---------------------------------------------|
| `add.rackModule`        | No cache bust       | `cacheBust(['rackWithId'])`       | `getRackWithId` was stale after adding a module to a rack |
| `add.rack`              | `['rackWithId']`    | `['rackWithId', 'racksMinimal']`  | New rack was invisible in `getRacksMinimal` lists until TTL expired |
| `update.rackedModules`  | No cache bust       | `cacheBust(['rackWithId'])`       | Module reorder/layout save left cached rack stale |
| `update.rack`           | `['rackWithId']`    | `['rackWithId', 'racksMinimal']`  | Rack name/public changes not reflected in minimal list |
| `delete.rackedModule`   | No cache bust       | `cacheBust(['rackWithId'])`       | Removed module still appeared in cached rack |
| `delete.modulesOfRack`  | No cache bust       | `cacheBust(['rackWithId'])`       | Cleared rack still showed cached modules    |
| `delete.userRack`       | `['rackWithId']`    | `['rackWithId', 'racksMinimal']`  | Deleted rack remained in minimal rack list  |

## Audit Findings & Fixes Applied (11-08-2026)

| Operation               | Before              | After                             | Impact                                      |
|-------------------------|---------------------|-----------------------------------|---------------------------------------------|
| `delete.modulePanel`    | No cache bust       | `cacheBust(['modules', 'moduleWithId'])` | Asymmetric with `add.panel` (already busted these keys); deleted panel remained visible in cached `getModuleWithId` for up to `defaultCacheTime` |
| `get.standards()`       | Uncached (network on every module-editor open) | `@Cacheable({maxAge: longCacheTime})` via `getStandards()` | Standards list is effectively static (no write path); every module-editor open previously re-fetched it |
| `get.statistics()`      | Uncached (3 network round trips per home page load) | `@Cacheable({maxAge: defaultCacheTime})` via `getStatistics()` (TTL-only, no busting) | Repeat home page visits within 5 minutes previously re-issued 3 count queries |

---

## Rules for Future Agents

1. When adding a new `GET` / `@Cacheable` method: add the key to `CachedEntity` in `supabase.cache.ts`
   and add a row to the inventory above.
2. When adding a new write method: cross-reference every table touched against the inventory above
   and add `cacheBust([...affected keys])` **before** `remapErrors()` in the pipeline.
3. `racksMinimal` must always be busted alongside `rackWithId` for any rack-level create/update/delete.
4. `rackWithId` must be busted for any `rack_modules` mutation (add/update/delete).
5. Never bust keys that are not affected by the mutation — unnecessary busts cause extra round-trips.
