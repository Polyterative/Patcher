# Analytics — PostHog Event Instrumentation

Single source of truth for product event names, properties, and the process for
adding new instrumentation. **Any drift between this doc and the code is a bug.**

---

## Tooling boundary

| Tool | Owns |
|---|---|
| **PostHog** | Product events, funnels, retention, user journeys |
| **Sentry** | Errors, performance, replays on error |

**Never** enable PostHog exception capture, Web Vitals capture, or session
recording on top of Sentry replays — see the boundary rules in
`internaldocs/workflow/plans/analytics-posthog-product-instrumentation.md`.

---

## Naming rules

- Format: `domain.action` — snake_case, past-tense verbs.
  - ✅ `rack.module_added`
  - ❌ `addModuleToRack`, `rack_module_add`
- No PII in properties. No user email, no raw user-supplied text.
- Properties: use `snake_case` keys, scalar values only (string | number | boolean).
- Every event automatically carries `release` and `commit` super-properties (set by the PostHog loader).
- The PostHog loader sets `respect_dnt: true`; browsers with Do Not Track enabled must not emit events.
- Mark auth credentials and raw feedback text inputs with `data-ph-no-capture` even when PostHog would mask them by default.

---

## Capturing events

`AnalyticsService` (`src/app/features/backbone/analytics-integration/analytics.service.ts`)
is the **only app-facing** entry-point. The SDK import/init lives in
`src/app/features/backbone/analytics-integration/posthog-loader.ts`; import
`posthog-js` nowhere else.

```typescript
// inject in a data service (not a component, unless it's a dialog-leaf component)
constructor(private analytics: AnalyticsService) {}

// fire inside a tap() next to the side effect that produced it
.pipe(
  tap(result => this.analytics.capture('rack.created', { rack_id: result.id }))
)
```

---

## Event taxonomy

| Event | Where fires | Required props |
|---|---|---|
| `auth.signed_in` | `UserManagementService.initializeLoginHandler` | `method: 'password'` |
| `auth.signed_out` | `UserManagementService.initializeLogoffHandler` | — |
| `auth.signed_up` | `UserSignupDataService` signup handler | `method: 'password'` |
| `rack.created` | `RackCreatorComponent` on backend success | `rack_id` |
| `rack.deleted` | `RackDetailDataService.deleteRack$` subscribe | `rack_id` |
| `rack.duplicated` | `RackDetailDataService.duplicateRack$` subscribe | `rack_id` |
| `rack.viewed` | `RackDetailDataService` on first data load | `rack_id`, `is_owner`, `module_count` |
| `rack.module_added` | `RackDetailDataService.addModuleToRack$` subscribe | `rack_id`, `module_id` |
| `rack.module_removed` | `RackDetailDataService.requestRackedModuleRemoval$` subscribe | `rack_id`, `module_id` |
| `rack.module_moved` | `RackDetailDataService.rackOrderChange$` subscribe | `rack_id` |
| `patch.created` | `PatchCreatorComponent` on backend success | — |
| `patch.deleted` | `PatchDetailDataService.deletePatch$` subscribe | `patch_id` |
| `patch.connection_added` | `PatchDetailDataService.confirmSelectedConnection$` subscribe | `patch_id` |
| `patch.connection_removed` | `PatchDetailDataService.removeConnectionFromEditor$` subscribe | `patch_id` |
| `module.viewed` | `ModuleDetailDataService` on first data load | `module_id`, `manufacturer_id` |
| `module.collection_toggled` | `ModuleDetailDataService` add/remove/setModulePossession subscribes | `module_id`, `state` (added \| removed) |
| `module_collection.browser_viewed` | `ModuleCollectionsDataService` / `ModuleCollectionsBrowserDataService` list load success | `view` (public \| user_area) |
| `module_collection.viewed` | `ModuleCollectionsDataService` / `ModuleCollectionsDetailDataService` collection load success | `collection_id`, `source` |
| `module_collection.created` | `ModuleCollectionsDataService.saveCollection` create success | `collection_id`, `module_count`, `public` |
| `module_collection.updated` | `ModuleCollectionsDataService.saveCollection` update success | `collection_id`, `module_count`, `public` |
| `module_collection.deleted` | `ModuleCollectionsDataService.deleteCollection` delete success | `collection_id` |
| `module_collection.discovery_filter_changed` | `ModuleCollectionsBrowserDataService` filter change after initial load | `search_active`, `search_length`, `order` |
| `module_collection.discovery_filters_reset` | `ModuleCollectionsBrowserDataService.resetForm$` | — |
| `module_collection.discovery_search_performed` | `ModuleCollectionsBrowserDataService` page load after search/filter state | `search_active`, `search_length`, `order`, `result_count`, `total`, `remaining`, `failed` |
| `module_collection.discovery_load_more` | `ModuleCollectionsBrowserDataService.loadMore$` | `loaded_count`, `remaining`, `order`, `search_active` |
| `module_collection.discovery_collection_clicked` | `ModuleCollectionsBrowserDataService.collectionOpened$` | `collection_id`, `public_id`, `rank`, `module_count` |
| `search.performed` | `ModuleBrowserDataService.updateModulesList$` subscribe | `query_len`, `filters_active`, `result_count` |
| `manufacturer.viewed` | `ManufacturerDetailDataService` on data load | `manufacturer_id` |
| `feedback.submitted` | `ModuleFlagDataService.submitFlag$` backend success | `category`, `length` |
| `admin.action_performed` | `AdminFlagsDataService` resolve/reopen/delete flag success | `action` |

---

## Adding a new event — checklist

1. Add a row to the table above with name, location, and required props.
2. Add a `this.analytics.capture(...)` call via `tap()` in the correct data service.
3. Open the Patcher app in dev and perform the action.
4. Verify the event appears in **PostHog → Live Events** (filter `env = development`
   if you temporarily enable dev-mode capture, otherwise check prod after deploy).
5. Add the event to any relevant PostHog dashboard.

---

## Verifying an event in PostHog

1. Build and deploy to production (or temporarily enable in dev by removing the
   `!environment.production` guard in `AnalyticsService` — **revert before merge**).
2. In PostHog → **Activity → Live Events**, set filter:
   - `release = <your version>` or `commit = <your hash>`
   - `distinct_id = <your PostHog id>`
3. Perform the action in the app.
4. Confirm the event appears with the expected properties.

---

## Decision log

- 2026-06-10 — Chose PostHog Cloud (EU) over self-host / Mixpanel / GA4 / DIY Supabase.
  Free tier ≤ 1M events/mo; open-source escape hatch available.
- 2026-06-16 — `posthog-loader.ts` is the only file importing `posthog-js`; `AnalyticsService`
  is eagerly booted by `AppComponent` so route pageviews are wired before lazy feature chunks load.
  Enforced by `scripts/checks/check-posthog-imports.sh` in CI.
