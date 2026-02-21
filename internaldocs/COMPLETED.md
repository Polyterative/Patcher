# Completed Features

> Archive of finished work. One-line summaries only. For strategy context see `PRODUCT_NEEDS.md`.

---

## Done

| Feature                                                                     | Date   | Notes                                                                                                              |
|-----------------------------------------------------------------------------|--------|--------------------------------------------------------------------------------------------------------------------|
| Private patches                                                             | Feb 18 | `public` field, toggle, default public                                                                             |
| Blank module education                                                      | Feb 18 | FAQ entry, rack editor tooltip, context menu                                                                       |
| User-submitted manufacturers                                                | Feb 19 | Inline creation form, auto-select on create                                                                        |
| Account data deletion                                                       | Feb 19 | `delete.allUserData()`, confirm dialog                                                                             |
| Cable/multiples counter                                                     | Feb 19 | `PatchConnectionStatsPipe`, statistics panel                                                                       |
| iOS clipboard fix                                                           | Feb 19 | textarea + execCommand fallback                                                                                    |
| Rack stats blank filter                                                     | Feb 19 | `BLANK_MODULE_IDS` filter in 6 stats pipes                                                                         |
| Bug sweep                                                                   | Feb 19 | Double backend call, snackBar, readonly, dead code                                                                 |
| Security audit – secrets in repo                                            | Feb 19 | Gitleaks clean, .gitignore hardened                                                                                |
| Account mgmt – password change                                              | Feb 19 | Inline form, min 8 chars, 9 tests                                                                                  |
| Duplicate panel detection                                                   | Feb 19 | Client-side validation in editor                                                                                   |
| E2E test setup – Playwright                                                 | Feb 19 | Config, scripts, helpers, removed Protractor                                                                       |
| E2E – module browser smoke test                                             | Feb 19 | 4 tests: page load, cards, paginator, heading                                                                      |
| Multi-Instance DB + Manual UI                                               | Feb 20 | DB tables + CRUD done; manual UX frozen — replaced by auto-instance                                                |
| Auto-Instance on Module Add                                                 | Feb 20 | Collection-first editor, batch insert, null normalization, 284 tests                                               |
| Instance-Aware CV Highlighting                                              | Feb 20 | Only selected instance's CVs light up; 9 regression tests                                                          |
| Instance Labels in Read-Only View                                           | Feb 20 | instanceLabelMap$ threaded to connection list; per-instance labels in read-only                                    |
| Instance delete confirmation                                                | Feb 20 | Confirmation shown when deleting instance with active connections                                                  |
| Instance-Aware Statistics card                                              | Feb 20 | Stats card in patch left column; visible in read and edit modes                                                    |
| Instance Labels Visible to All                                              | Feb 20 | Fixed stale cache; RLS relaxed for public patches; Module Copies card; 313 tests                                   |
| Auto-Save Patch Editing                                                     | Feb 20 | Connections and metadata auto-save via concatMap; removed Save button; 313 tests                                   |
| Module Copies — Limit, Safety, Spam, Stats                                  | Feb 20 | Copy limit 20/module; in-flight guard; stats show Cables/Modules/Multiples only                                    |
| Patch Editor UX — Compact Connections + On-Demand Notes + Collapsible Graph | Feb 20 | Connections above graph; collapsible graph; on-demand notes; compact rows; 322 tests                               |
| Patch View UX — Layout Restructure + Fit-to-Screen                          | Feb 20 | Graph capped at 30rem; editor in right column; right-column overflow fixed                                         |
| Connection Notes — Auto-Save + UX                                           | Feb 20 | Auto-save via debounce+switchMap; note field inline; targeted single-row UPDATE                                    |
| Left-Sidebar Filter Panel (Module / Rack / Patch)                           | Feb 21 | Replaced filter strip with CSS flex sidebar; reset normalised across all browsers                                  |
| Filter Sidebar — Reset-Button Guard + Manufacturer Autocomplete Fix         | Feb 21 | canReset$ via merge+startWith; filterStateForced$ fixes HP blank-but-active                                        |
| BUG — Material label stays floated after form reset                         | Feb 21 | isResetting guard replaces emitEvent:false; Material label resets correctly                                        |
| Sticky Floating "Current Selection" Panel                                   | Feb 21 | position:fixed overlay; conditionally rendered; bridge service; deselect buttons                                   |
| Unified Edit FAB                                                            | Feb 21 | EditFabComponent (mat-fab extended); wired to patch/rack/module editors; 318 tests                                 |
| Edit FAB — Position Fix + Service-Layer Toggle Routing                      | Feb 21 | fixed position bottom-right; requestPatchEditingToggle$ + requestModuleEditingToggle$ added to services; 318 tests |
| Edit FAB — Opacity + Padding Polish                                         | Feb 21 | opacity 0.8 at rest → 1 on hover; padding-left/right 1.5rem; 318 tests                                             |