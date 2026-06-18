<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Analytics — PostHog Product Instrumentation

**Status:** Done for code-owned repository work; PostHog dashboard creation remains external/manual.

**Why:** Sentry catches errors but tells us nothing about *what users actually do*.
We want per-feature usage stats, funnels, and per-event detail dashboards so product
decisions stop being guesswork. PostHog Cloud (EU, free tier ≤1M events/mo) was
chosen over self-hosted, GA4, Plausible, and a DIY Supabase events table — see
the comparison in chat history (2026-06-10).

**What's already live (do not redo):**
- `posthog-js` installed.
- `src/main.ts` initializes PostHog (EU host, autocapture on, manual SPA pageviews,
  session recording off, debug + `env: 'development'` super-property in non-prod).
- `AnalyticsService` (`src/app/features/backbone/analytics-integration/analytics.service.ts`)
  exposes `capture()`, `identify()`, `reset()`, plus auto router `$pageview`.
- `UserManagementService.initializeAnalyticsIdentityHandler()` ties PostHog identity
  to the Supabase user on login/logout.
- AdGuard (TrueNAS) allowlist updated for `*.posthog.com`.
- **Currently runs in dev** for verification — must be flipped back to prod-only
  before this plan is closed (see Layer 0).

**Goal of this plan:** turn the bare wiring into a real instrumentation layer with
a defined event taxonomy, calls in every meaningful pipeline, and a dashboard set
that answers concrete product questions.

---

## Layer 0 — Tighten the foundation

- [x] Re-add prod-only guards to `AnalyticsService.capture/identify/reset` and
      `getPostHog()` once dev verification is done.
- [x] Add a `cookie_consent` / `respect_dnt` confirmation pass — verify no events
      fire when DNT is on; mention PostHog in privacy copy if not already covered.
      ✅ Code pass: `posthog-loader.ts` sets `respect_dnt: true`; live browser verification remains a deploy/manual check.
- [x] Add a build-time super-property: `register({ release: build.version, commit: build.git.hash })`
      so dashboards can slice by release. ✅ Done in `main.ts`.
- [x] Mask sensitive autocapture surfaces: confirm password fields and any email
      inputs carry `data-ph-no-capture` (PostHog autocapture default already skips
      `<input type="password">`, but verify on login + reset-password forms). ✅ Added markers to login,
      signup, password reset, password-reset request, and raw module-flag note fields.

### Sentry ↔ PostHog boundary (do NOT cross these lines)

The two tools have distinct lanes; redundancy here means double quota burn,
duplicate alerts, and confused dashboards. Keep them split:

- [x] **Do not enable PostHog exception / error capture.** Errors are
      single-sourced in Sentry. ✅ Not enabled.
- [x] **Do not enable PostHog Web Vitals or performance capture.** ✅ Not enabled.
- [x] **Do not enable PostHog session recording on top of Sentry replays.** ✅ Recording off.
- [x] Cross-link the two for debugging: on Sentry init set the PostHog
      `distinct_id` as a Sentry tag, and register Sentry's `release` / `dist`
      as PostHog super-properties. ✅ Done in `main.ts` `beforeSend`.
- [x] Lower Sentry `tracesSampleRate` from `1.0` → `0.2` — **REVERTED per user request.
      Kept at `1.0`.**

## Layer 1 — Event taxonomy (decide once, document, then sprinkle)

- [x] Add `internaldocs/patterns/ANALYTICS.md` with:
  - Naming rule: `domain.action` snake_case, past-tense verbs, no PII in props.
  - Source-of-truth event list (start with the table below).
  - "Adding a new event" checklist (update doc → add `capture()` call → verify in
    PostHog Live Events → add to relevant dashboard). ✅ Done.

**Initial event list:**

| Event | Where to fire | Required props |
|---|---|---|
| `auth.signed_in` / `auth.signed_out` | `UserManagementService` login/logoff handlers | `method` (password / oauth) |
| `auth.signed_up` | new account creation handler | `method` |
| `rack.viewed` | rack route component on enter | `rack_id`, `is_owner`, `module_count` |
| `rack.created` / `rack.deleted` / `rack.duplicated` | rack data service | `rack_id` |
| `rack.module_added` / `rack.module_removed` / `rack.module_moved` | rack edit pipeline | `rack_id`, `module_id`, `manufacturer_id` |
| `rack.shared` | share action | `rack_id`, `target` (link / image / embed) |
| `patch.created` / `patch.deleted` | patch data service | `patch_id`, `rack_id` |
| `patch.connection_added` / `patch.connection_removed` | patch editor pipeline | `patch_id` |
| `module.viewed` | module detail route | `module_id`, `manufacturer_id`, `source` (search / list / rack / mfr) |
| `module.collection_toggled` | collection toggle | `module_id`, `state` (added / removed) |
| `search.performed` | module browser search submit | `query_len`, `filters_active`, `result_count` |
| `manufacturer.viewed` | mfr page | `manufacturer_id` |
| `feedback.submitted` | module report / feedback submission | `category`, `length` |
| `admin.action_performed` | admin flag panel | `action` |

## Layer 2 — Instrument the pipelines

One PR per domain so review stays scoped. Inject `AnalyticsService` into the
relevant **data services** (not components) and wire via `tap()` into the existing
reactive pipelines so events fire next to the side effect that produces them.

- [x] **Auth domain** — `UserManagementService` login / signup / logoff handlers. ✅ Done.
- [x] **Rack domain** — create / delete / duplicate / module add / remove / move; `rack.viewed`; share deferred. ✅ Done.
- [x] **Patch domain** — create / delete / connection add / remove. ✅ Done.
- [x] **Module browser** — `search.performed`; `module.viewed`; `source` param deferred. ✅ Done.
- [x] **Manufacturer page** — `manufacturer.viewed` on enter. ✅ Done.
- [x] **Collection / Cool / Feedback / Admin** — sprinkle remaining events. ✅ Collection events already
      exist; feedback is captured from the existing module-flag submission flow with category/length only;
      admin flag resolve/reopen/delete actions now emit `admin.action_performed`; no distinct "Cool"
      action flow exists in current app code.
- [ ] Spot-check every PR in PostHog Live Events with `env = development` filter
      before merging. **Blocked/manual:** requires PostHog dashboard access and deploy/dev verification setup.

## Layer 3 — Dashboards (PostHog UI, no code)

Build these in PostHog and pin them to a "Patcher" dashboard folder.

- [ ] **North-star funnel:** `$pageview (home)` → `auth.signed_up` → `rack.created`
      → `rack.module_added` → returning visit within 7 days.
- [ ] **Engagement:** DAU / WAU / MAU; retention cohorts by signup week.
- [ ] **Per-feature usage:** weekly trend of every `domain.*` event family,
      stacked-bar breakdown by domain.
- [ ] **Search quality:** ratio of `search.performed` followed by `module.viewed`
      within 30s; histogram of `result_count`.
- [ ] **Manufacturer popularity:** `module.viewed` breakdown by `manufacturer_id`,
      filter to `source = mfr` for direct mfr-page traffic.
- [ ] **Rack composition health:** `rack.module_added` / `rack.module_removed`
      ratio per session; outlier detection for sessions with many removes.
- [ ] **Drop-off paths:** PostHog "Paths" insight from `rack.viewed` to next event;
      surface where users get stuck.
- [ ] **Per-event raw view:** PostHog "Live events" + a saved "Events" insight
      filtered to the last 24h so we can see individual fire-by-fire detail.

## Layer 4 — Optional (defer until basics shipped)

- [ ] Session replay sampled at 10% on prod (free tier covers it); useful for
      reproducing UX bugs reported via `feedback.submitted`.
- [ ] Feature flags via PostHog — replace ad-hoc env toggles for experimental
      surfaces (e.g. Remix optimizer).
- [ ] Group analytics keyed on `manufacturer_id` for B2B-style insights once
      manufacturer accounts ship.
- [ ] Webhook from PostHog → a `analytics_events_raw` Supabase table if we ever
      need to join product analytics against app data in SQL.
- [ ] Alerts: PostHog → Discord / email on funnel-drop-off spike or zero-event
      release (proxy for instrumentation regression).

## Layer 5 — Hygiene

- [x] Add a unit test for `AnalyticsService` (happy path no-ops in test env;
      `capture` resolves without throwing when SDK is absent). ✅ Done (`analytics.service.spec.ts`).
- [x] Add a lint rule or CI grep that fails if `posthog-js` is imported anywhere
      outside `analytics.service.ts` and `main.ts` (single chokepoint, mirrors
      the Sentry pattern). ✅ Done (`scripts/checks/check-posthog-imports.sh`, wired into `lint`).
- [x] Document in `internaldocs/patterns/ANALYTICS.md` how to verify a new event
      reaches PostHog (Live Events filter with `env`, `release`, distinct_id). ✅ Done.

---

## Acceptance criteria

- Every event in the Layer 1 table fires from production code paths.
- Every dashboard in Layer 3 exists in PostHog and answers its question without
  ad-hoc SQL.
- `AnalyticsService` is the only file importing `posthog-js` (besides `main.ts`).
- Dev builds do not send events unless `env: 'development'` super-property is
  present (i.e. you can always tell dev traffic apart in dashboards).
- `internaldocs/patterns/ANALYTICS.md` is the single source of truth for event
  names and props; drift between code and doc is treated as a bug.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-10 — Chose PostHog Cloud (EU) over self-host / Mixpanel / Amplitude /
  GA4 / DIY Supabase. Free tier (1M events/mo) is comfortably above current scale;
  open-source escape hatch exists.
- 2026-06-10 — Initial wiring landed (posthog-js, AnalyticsService, identity
  handler, AdGuard allowlist). Currently enabled in dev for verification —
  Layer 0 must revert that before this plan is closed.
- 2026-06-18 — Round 2 closed the code-owned slice: DNT is handled by
  `respect_dnt: true`; auth/password-reset inputs and module-flag notes are marked
  `data-ph-no-capture`; existing collection instrumentation was documented; module
  reports emit `feedback.submitted` with category/length only; admin flag
  resolve/reopen/delete emits `admin.action_performed`. PostHog Live Events and
  dashboard creation remain external/manual because they require PostHog UI access.

- 2026-06-18 — Archived after reviewer approval and green targeted checks, PostHog import check, docs check, and `pnpm lint`.
