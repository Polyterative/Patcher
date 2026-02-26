# Completed Features

> Archive of finished work. One-line summaries only. For strategy context see `PRODUCT_NEEDS.md`.

---

## Done

| Feature                                                                     | Date  | Notes                                                                                                    |
|-----------------------------------------------------------------------------|-------|----------------------------------------------------------------------------------------------------------|
| Stylelint px-to-rem tooling                                                 | 02-26 | Added stylelint config and conversion scripts for consistent rem units across SCSS                       |
| CI — skip builds on docs-only changes                                       | 02-26 | Vercel `ignoreCommand` updated; sitemap fix; docs-only commits no longer trigger full builds             |
| Supabase service restructure                                                | 02-26 | Reorganized into typed namespaces (get/add/delete/update); storage support added; query structure simplified |
| FAQ — accordion layout                                                      | 02-26 | Accordion layout, updated link button style and icon, roadmap links corrected                            |
| Comments — safe HTML rendering                                              | 02-26 | `commentText` pipe for sanitized HTML in comment display; link styles added to comment items             |
| Unified floating search — user area                                         | 02-26 | Global floating search implemented in user area alongside existing patch editor search                   |
| Patch graph — progressive reveal + flow animations                          | 02-26 | Progressive reveal controller, edge flow animation, progressive node rendering, enhanced node labels     |
| Patch editor compact sort/group controls + extra modes                      | 02-25 | Compacted inline controls and added manufacturer/connections sorts plus connection/patch-presence groups |
| Patch editor module sort + manufacturer grouping                            | 02-25 | Added backend-first sort modes, strategy-based local fallback/grouping, and inline sort/group controls   |
| Patch editor floating module search                                         | 02-25 | Added fixed floating module search beside close-edit FAB with normalized filtering for collection cards  |
| Homepage narrative component system                                         | 02-25 | Rebuilt `/home` with reusable story components, creative narrative sections, and embedded live previews  |
| E2E screenshot coverage — user area                                         | 02-24 | Added `/user/area` capture as `08-user-area.jpg`; screenshot suite now captures 8 deterministic areas    |
| E2E major-area screenshot automation                                        | 02-24 | Added authenticated deterministic screenshot flow and dedicated script for 7 major-area captures         |
| E2E authenticated login bootstrap + secrets wiring                          | 02-23 | Added Playwright auth helper/global setup/storage state, auth smoke test, and contributor setup docs     |
| Safari image export fix                                                     | 02-21 | Replaced `html-to-image` with `modern-screenshot`; 1 file, 2 call sites (`domToJpeg`)                    |
| Patch editor UX — CV badge, inline labels, Add Copy flicker fix             | 02-21 | `connectionCount$` wired, badge shown, inline row labels, trackingId tracks module cards                 |
| Empty state visible on browser pages                                        | 02-21 | `empty-state` component now shows icon + "No results found" text; added MatIconModule                    |
| Private patches                                                             | 02-18 | `public` field, toggle, default public                                                                   |
| Blank module education                                                      | 02-18 | FAQ entry, rack editor tooltip, context menu                                                             |
| User-submitted manufacturers                                                | 02-19 | Inline creation form, auto-select on create                                                              |
| Account data deletion                                                       | 02-19 | `delete.allUserData()`, confirm dialog                                                                   |
| Cable/multiples counter                                                     | 02-19 | `PatchConnectionStatsPipe`, statistics panel                                                             |
| iOS clipboard fix                                                           | 02-19 | textarea + execCommand fallback                                                                          |
| Rack stats blank filter                                                     | 02-19 | `BLANK_MODULE_IDS` filter in 6 stats pipes                                                               |
| Bug sweep                                                                   | 02-19 | Double backend call, snackBar, readonly, dead code                                                       |
| Security audit – secrets in repo                                            | 02-19 | Gitleaks clean, .gitignore hardened                                                                      |
| Account mgmt – password change                                              | 02-19 | Inline form, min 8 chars                                                                                 |
| Duplicate panel detection                                                   | 02-19 | Client-side validation in editor                                                                         |
| E2E test setup – Playwright                                                 | 02-19 | Config, scripts, helpers, removed Protractor                                                             |
| E2E – module browser smoke test                                             | 02-19 | 4 flows: page load, cards, paginator, heading                                                            |
| Multi-Instance DB + Manual UI                                               | 02-20 | DB tables + CRUD done; manual UX frozen — replaced by auto-instance                                      |
| Auto-Instance on Module Add                                                 | 02-20 | Collection-first editor, batch insert, null normalization                                                |
| Instance-Aware CV Highlighting                                              | 02-20 | Only selected instance's CVs light up                                                                    |
| Instance Labels in Read-Only View                                           | 02-20 | `instanceLabelMap$` threaded to connection list; per-instance labels in read-only                        |
| Instance delete confirmation                                                | 02-20 | Confirmation shown when deleting instance with active connections                                        |
| Instance-Aware Statistics card                                              | 02-20 | Stats card in patch left column; visible in read and edit modes                                          |
| Instance Labels Visible to All                                              | 02-20 | Fixed stale cache; RLS relaxed for public patches; Module Copies card                                    |
| Patch editor — remove subtitle, overlay action buttons                      | 02-21 | `nameSuffix` threaded through composite; buttons absolutely positioned with backdrop-filter              |
| Bug fix — Modules needed / stats update live during editing                 | 02-21 | `patchConnections$` → `editorConnections$` in patch-composite templates                                  |
| Auto-Save Patch Editing                                                     | 02-20 | Connections and metadata auto-save via concatMap; removed Save button                                    |
| Module Copies — Limit, Safety, Spam, Stats                                  | 02-20 | Copy limit 20/module; in-flight guard; stats show Cables/Modules/Multiples only                          |
| Patch Editor UX — Compact Connections + On-Demand Notes + Collapsible Graph | 02-20 | Connections above graph; collapsible graph; on-demand notes; compact rows                                |
| Patch View UX — Layout Restructure + Fit-to-Screen                          | 02-20 | Graph capped at 30rem; editor in right column; right-column overflow fixed                               |
| Connection Notes — Auto-Save + UX                                           | 02-20 | Auto-save via debounce+switchMap; note field inline; targeted single-row UPDATE                          |
| Left-Sidebar Filter Panel (Module / Rack / Patch)                           | 02-21 | Replaced filter strip with CSS flex sidebar; reset normalised across all browsers                        |
| Filter Sidebar — Reset-Button Guard + Manufacturer Autocomplete Fix         | 02-21 | `canReset$` via merge+startWith; `filterStateForced$` fixes HP blank-but-active                          |
| BUG — Material label stays floated after form reset                         | 02-21 | `isResetting` guard replaces `emitEvent:false`; Material label resets correctly                          |
| Sticky Floating "Current Selection" Panel                                   | 02-21 | position:fixed overlay; conditionally rendered; bridge service; deselect buttons                         |
| Unified Edit FAB                                                            | 02-21 | `EditFabComponent` (mat-fab extended); wired to patch/rack/module editors                                |
| Edit FAB — Position Fix + Service-Layer Toggle Routing                      | 02-21 | fixed position bottom-right; `requestPatchEditingToggle$` added to services                              |
| Edit FAB — Opacity + Padding Polish                                         | 02-21 | opacity 0.8 at rest → 1 on hover; padding-left/right 1.5rem                                              |
| Graph Stale-State Indicator + Debounced Auto-Refresh                        | 02-21 | `isStale$` + overlay; 3 s debounce on `editorConnections$`; height-lock on rebuild                       |
| Bug fix — connection note textarea clipped on multi-line                    | 02-21 | `align-items: flex-start` on editing-row; removed negative margin; padding-top on icons                  |