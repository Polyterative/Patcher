# User Area — Helpful tips pacing and persistence

## Status

Completed 2026-06-17.

## Problem

Helpful tips in the user area feel intrusive: the surface includes a "Why this?" disclosure that should be removed, and closing or skipping one tip can immediately trigger another. Existing users also risk seeing old backlog tips when the app adds or changes tips over time.

## Goals

- Remove the "Why this?" UI completely.
- Show at most one automatic tip per page load or user-area visit.
- Add a global spacing window so tips are spread over time instead of appearing back-to-back on reloads.
- Persist a per-viewer onboarding baseline so existing users only receive tips introduced after their baseline.
- Preserve existing local tip state during storage migration.
- Keep guided tours explicit and functional even when automatic tips are throttled.

## Assumptions

- Discovery tips remain a lightweight anchored surface, not a modal dialog.
- A guided tour started by the user may bypass automatic-tip pacing rules.
- A default spacing window of 6 hours is acceptable as the first product value because it is centralized and easy to tune.
- localStorage is sufficient for this client-side education state; no backend schema or RLS change is required.
- Code identifiers, constants, and comments stay in English.

## MVP layer

1. Remove the "Why this?" disclosure from `discovery-tip-surface.component.html`.
2. Add a page-load or visit-level guard in `DiscoveryTipService` so one displayed automatic tip prevents scheduling another automatic candidate until navigation/reload resets the guard.
3. Ensure `Later`, `Got it`, and completion actions clear the active tip without causing immediate replacement.
4. Add or update tests proving that one tip does not chain into the next after dismissal.

## Structural layer

1. Extend `DiscoveryTipDefinition` with `introducedAt: string` and optional `minSpacingMs?: number`.
2. Introduce a viewer-level storage shape:

   ```ts
   export interface DiscoveryTipViewerState {
     onboardingAt: string;
     lastTipShownAt?: string;
     lastShownTipId?: string;
     tips: Record<string, DiscoveryTipStateRecord>;
   }

   export interface DiscoveryTipStorageShape {
     schemaVersion: 2;
     viewers: Record<string, DiscoveryTipViewerState>;
   }
   ```

3. Add a new storage key such as `patcher.discovery-tips.v2`, while reading the legacy `patcher.discovery-tips.v1` key once for migration.
4. Preserve legacy tip records during migration, including `shownCount`, `learnedAt`, and `snoozedUntil`.
5. Initialize new viewer state with `onboardingAt`, then grandfather tips whose `introducedAt` is older than that baseline by marking them learned for automatic discovery.
6. Add `DEFAULT_TIP_SPACING_MS` and use `lastTipShownAt` to block automatic tips during the spacing window.
7. Update the registry so every tip has an `introducedAt` date.

## Polish layer

1. Keep guided tours independent from automatic pacing, so `startUserAreaTour` can still show ordered tour tips intentionally.
2. Remove dead view-model fields or SCSS left behind by the deleted "Why this?" UI.
3. Confirm the tip highlight still feels non-blocking after the pacing fix; only adjust visual treatment if the existing overlay still feels modal.

## File-level implementation checklist

- `src/app/shared-interproject/discovery-tips/discovery-tip.models.ts`
  - Add `introducedAt`, `minSpacingMs`, and `DiscoveryTipViewerState`.
  - Update `DiscoveryTipStorageShape` to schema version 2.
- `src/app/shared-interproject/discovery-tips/discovery-tip.constants.ts`
  - Add the v2 storage key, legacy v1 key, default storage shape, and `DEFAULT_TIP_SPACING_MS`.
- `src/app/shared-interproject/discovery-tips/discovery-tip.utils.ts`
  - Read v2 storage first.
  - Migrate v1 storage when v2 is absent.
  - Add viewer-state initialization and grandfathering helpers.
- `src/app/shared-interproject/discovery-tips/discovery-tip.registry.ts`
  - Add `introducedAt` to each registered tip.
- `src/app/shared-interproject/discovery-tips/discovery-tip.service.ts`
  - Load and persist viewer-level state.
  - Add one-tip-per-visit guard.
  - Apply spacing checks to automatic candidate selection.
  - Update `lastTipShownAt` and `lastShownTipId` only when a tip is actually activated.
  - Keep guided-tour flow bypassing automatic pacing.
- `src/app/shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component.html`
  - Delete the "Why this?" details block.
- `src/app/shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component.ts`
  - Remove unused reason view-model plumbing if no longer needed by the template.
- `src/app/shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component.scss`
  - Remove unused reason styles.
- Discovery tip specs
  - Update fixtures and add coverage for migration, grandfathering, cooldown, one-tip-per-visit, guided-tour bypass, and absence of "Why this?".

## Acceptance criteria

- The rendered helpful tip surface no longer contains "Why this?".
- Dismissing, acknowledging, or snoozing an automatic tip never immediately opens another automatic tip in the same visit.
- Automatic tips respect the global spacing window across reloads.
- Existing v1 localStorage records migrate without losing per-tip state.
- Existing viewers do not receive old registry tips as a backlog after migration.
- New registry tips introduced after a viewer baseline can still appear when eligible.
- Guided tours still progress through their explicit ordered sequence.

## Validation

- Run targeted discovery-tip specs:

  ```bash
  pnpm test-headless --include="**/discovery-tip*.spec.ts"
  ```

- Run repository lint:

  ```bash
  pnpm lint
  ```

- If visual behavior changes beyond removing "Why this?", capture a user-area snapshot with the app running before final delivery.

## Decision log

- 2026-06-17: Use localStorage v2 migration instead of backend persistence because the state is client education state and does not require cross-device consistency.
- 2026-06-17: Use one automatic tip per visit plus a 6-hour default spacing window to prevent chained interruptions while still allowing gradual discovery.
- 2026-06-17: Keep guided tours exempt from automatic-tip throttling because the user explicitly requested that flow.
