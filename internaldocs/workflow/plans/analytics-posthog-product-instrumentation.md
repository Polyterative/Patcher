<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Analytics — PostHog Product Instrumentation

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
- [ ] Add a `cookie_consent` / `respect_dnt` confirmation pass — verify no events
      fire when DNT is on; mention PostHog in privacy copy if not already covered.
- [ ] Add a build-time super-property: `register({ release: build.version, commit: build.git.hash })`
      so dashboards can slice by release.
- [ ] Mask sensitive autocapture surfaces: confirm password fields and any email
      inputs carry `data-ph-no-capture` (PostHog autocapture default already skips
      `<input type="password">`, but verify on login + reset-password forms).

### Sentry ↔ PostHog boundary (do NOT cross these lines)

The two tools have distinct lanes; redundancy here means double quota burn,
duplicate alerts, and confused dashboards. Keep them split:

- [ ] **Do not enable PostHog exception / error capture.** Errors are
      single-sourced in Sentry. If you ever see `posthog.captureException` or
      the PostHog "Error tracking" toggle in our config, that's a regression —
      remove it.
- [ ] **Do not enable PostHog Web Vitals or performance capture.** Performance
      is single-sourced in Sentry's `browserTracingIntegration`. PostHog stays
      product-events only.
- [ ] **Do not enable PostHog session recording on top of Sentry replays.**
      Currently Sentry handles error-replay (`replaysOnErrorSampleRate: 1.0`)
      and PostHog recording is `disabled`. If we ever want broad/sampled
      replay, switch to PostHog's (free in our tier) and turn Sentry's replay
      integration off — never run both.
- [ ] Cross-link the two for debugging: on Sentry init set the PostHog
      `distinct_id` as a Sentry tag, and register Sentry's `release` / `dist`
      as PostHog super-properties. One click between an error and that user's
      PostHog timeline.
- [ ] Lower Sentry `tracesSampleRate` from `1.0` → `0.2` (separate concern from
      PostHog, but the audit surfaced it — quota-cheap perf coverage).

## Layer 1 — Event taxonomy (decide once, document, then sprinkle)

- [ ] Add `internaldocs/patterns/ANALYTICS.md` with:
  - Naming rule: `domain.action` snake_case, past-tense verbs, no PII in props.
  - Source-of-truth event list (start with the table below).
  - "Adding a new event" checklist (update doc → add `capture()` call → verify in
    PostHog Live Events → add to relevant dashboard).

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
| `feedback.submitted` | feedback box | `length` |
| `admin.action_performed` | admin panel | `action` |

## Layer 2 — Instrument the pipelines

One PR per domain so review stays scoped. Inject `AnalyticsService` into the
relevant **data services** (not components) and wire via `tap()` into the existing
reactive pipelines so events fire next to the side effect that produces them.

- [ ] **Auth domain** — `UserManagementService` login / signup / logoff handlers.
- [ ] **Rack domain** — `RackEditorDataService` (and equivalents) for create / delete /
      duplicate / module add / module remove / module move; `RackDetailComponent`
      for `rack.viewed`; share component for `rack.shared`.
- [ ] **Patch domain** — patch data service for create / delete / connection
      add / remove.
- [ ] **Module browser** — module browser data service for `search.performed`;
      module detail route for `module.viewed` (record the `source` param via the
      navigation that opens it).
- [ ] **Manufacturer page** — `manufacturer.viewed` on enter.
- [ ] **Collection / Cool / Feedback / Admin** — sprinkle remaining events.
- [ ] Spot-check every PR in PostHog Live Events with `env = development` filter
      before merging.

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

- [ ] Add a unit test for `AnalyticsService` (happy path no-ops in test env;
      `capture` resolves without throwing when SDK is absent).
- [ ] Add a lint rule or CI grep that fails if `posthog-js` is imported anywhere
      outside `analytics.service.ts` and `main.ts` (single chokepoint, mirrors
      the Sentry pattern).
- [ ] Document in `internaldocs/patterns/ANALYTICS.md` how to verify a new event
      reaches PostHog (Live Events filter with `env`, `release`, distinct_id).

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
