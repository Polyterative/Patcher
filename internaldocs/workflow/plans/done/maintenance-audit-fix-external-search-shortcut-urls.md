<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Maintenance — audit & fix external search shortcut URLs

**Why:** External shop/forum search URLs in
`src/app/features/module-browser/module-browser-detail/module-browser-detail.constants.ts`
can break when sites redesign. Schneidersladen is confirmed broken (reported 2026-05-16 —
the current URL template `https://schneidersladen.de/en/search?sSearch=` no longer returns
results; likely a site redesign). Fix or replace before the next release.

**Quick audit results (2026-05-15, test query "maths"):**

| Site | Status | Notes |
|------|--------|-------|
| Google | ✅ | |
| YouTube | ✅ | |
| Modwiggler | ✅ | |
| Lines (llllllll.co) | not checked | |
| Elektronauts | not checked | |
| Modulargrid | ✅ | |
| VCV Library | not checked | |
| Wigglehunt | ✅ | |
| Thomann | not checked | |
| Schneidersladen 🇩🇪 | ❌ | **Broken** (confirmed 2026-05-16) — `?sSearch=` query param no longer works after site redesign; needs new URL pattern or removal |
| Signalsounds 🇬🇧 | ✅ | |
| Exploding Shed | ✅ | |
| Elevatorsound 🇬🇧 | ✅ | |
| Perfect Circuit 🇺🇸 | not checked | |
| Milk Audio Store 🇮🇹 | ✅ | |
| New Groove 🇮🇹 | ✅ | |
| Escape From Noise 🇸🇪 | ✅ | |
| Machineroom 🇺🇦 | ✅ | |
| Control 🇺🇸 | ✅ | |
| Patchwerks 🇺🇸 | ⚠️ | SSL/connection timeout — needs manual check |
| Found Sound 🇦🇺 | ✅ | |
| Synthshop 🇳🇴 | ✅ | |

**Checklist:**

- [x] Manually verify unchecked URLs and Patchwerks in a browser — confirm search results
      actually appear (HTTP 200 is not sufficient; some sites redirect broken searches to
      homepage with 200). — Lines ✅, Elektronauts ✅, VCV Library ✅, Thomann (geo-redirects) ✅, Patchwerks ✅ (no SSL timeout)
- [x] Fix or remove any broken entries in `module-browser-detail.constants.ts`. — Schneidersladen `?sSearch=` → `?search=` (Shopware 6 migration); Wigglehunt tooltip corrected.
- [x] Add a comment at the top of the constants file noting the last audit date so future
      maintainers know when to re-check.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

