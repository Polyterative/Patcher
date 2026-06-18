<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: FUI-inspired instrument components

> **Status:** On hold pending product-owner selection. Do not implement until the user explicitly chooses which component idea(s) to pursue.

**Why:** Patcher should gain small, earned futuristic / Blade Runner-style moments without a general visual overhaul. The current look should remain intact; this plan only captures compact instrument-like components that expose real product data. The reference quality is the rack detail balance analysis chart: futuristic because it visualizes meaningful rack structure, not because it adds decorative sci-fi chrome.

**Design rule:** Futuristic treatment is allowed only when the component reveals real structure, status, proportion, or signal flow. Charts, meters, rulers, matrices, telemetry badges, and compact technical readouts fit. Decorative scanlines, fake glows, random HUD corners, ambient noise, non-informational gradients, or idle animations do not.

**Decision-pending component ideas:**

| Idea | Candidate surface | Data / meaning | Notes |
|---|---|---|---|
| Rack diagnostics strip | Rack detail header | HP used, module count, category balance, possibly power/depth if available | Small monospace telemetry row with subtle tick marks and restrained amber/blue indicators. |
| Signal-flow mini-map | Patch detail / rack detail | Modules as nodes, patch cables or relationships as lines | Should be static by default; hover/selection can highlight real connections. |
| Module telemetry badge | Module cards / module detail | HP, depth, format, category, manufacturer metadata | Industrial spec-label treatment; useful before any broader card redesign. |
| Balance radar / polar chart variant | Rack detail | Category spread across voices, modulation, utilities, effects, sequencing, etc. | Extend the successful balance-analysis visual language rather than inventing a new one. |
| Patch complexity meter | Patch cards / patch detail | Connection count, module count, modulation density, feedback risk if computable | Thin segmented meter; only include metrics that are honestly derived. |
| Manufacturer ID plate | Manufacturer detail / module detail | Manufacturer, country, module count, average HP, most-used category | Compact technical identity block; no marketing-card treatment. |
| Rack silhouette ruler | Rack detail | HP width and row proportions | Subtle HP ruler/tick system along the rack width; reinforces modular scale. |
| Activity / event readout | User area / rack detail | Updated time, patches, modules added, visibility | Machine telemetry strip for existing events/status. |
| Connection matrix preview | Patch detail | Module-to-module connection presence | Tiny grid/matrix; very FUI if based on actual patch topology. |
| Module category spectrum | Rack cards / rack detail | Category distribution | Small stacked line/bar readout, similar to analyzer/EQ language. |

**Potential first slice once selected:**

- Pick one surface only, preferably rack detail because the balance analysis chart already proves the visual language there.
- Build one compact readout component using existing data only.
- Keep styling local and conservative; do not change global palette, typography, app shell, or browser card system.
- Snapshot before/after at desktop, tablet, and mobile widths.

**Checklist:**

- [ ] Product owner selects one or more component ideas from the decision-pending list.
- [ ] Define the exact source data for the selected component.
- [ ] Confirm the component reveals meaningful information and is not ornamental.
- [ ] Draft a focused implementation plan for only the selected surface.
- [ ] Implement behind existing visual language constraints; no general redesign.
- [ ] Validate responsive behavior and visual fit against the rack balance analysis chart quality bar.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18T11:05+02:00 — Captured user preference: do not pursue a broad visual overhaul now. Preserve the current general look and backlog only small FUI / Blade Runner-style instrument components inspired by the rack detail balance analysis chart. Plan is blocked until the user later chooses which ideas to pursue.
