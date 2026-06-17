<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Bug — Native upload click does not open file picker on macOS

**Problem:** The deprecated `ngx-dropzone` migration replaced the upload widget with a native hidden file input and programmatic click handler. Manual macOS validation showed clicking the dropzone does not open the browser file picker, so users cannot pick module images by click.

**Goals:**

- Restore reliable click-to-pick behavior for module image uploads on macOS browsers.
- Preserve drag/drop, accepted-file validation, single/multi file behavior, previews, remove buttons, and keyboard accessibility.
- Keep the implementation native; do not reintroduce `ngx-dropzone`.

**Assumptions:**

- Native pointer activation of an `<input type="file">` is more reliable than delegating a click from a parent container on macOS/Safari-like browser constraints.
- Remove buttons must remain clickable without opening the file picker.

**MVP:**

- Make the file input itself cover the dropzone as the native click target.
- Keep keyboard activation on the focusable dropzone wrapper for Enter/Space.

**Structural:**

- Layer previews and remove buttons above the transparent input so remove actions are not intercepted.
- Stop input click propagation so the wrapper does not also dispatch a programmatic click.

**Polish:**

- Add focused component coverage for keyboard-triggered picker activation.
- Run targeted upload tests plus lint/docs checks.

**File-level checklist:**

- [x] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.component.html`
- [x] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.component.scss`
- [x] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.component.spec.ts`
- [x] `internaldocs/workflow/TODO.md`
- [x] `internaldocs/workflow/CURRENT_FEATURE.md`

**Acceptance criteria:**

- Clicking the upload dropzone opens the native file picker on macOS.
- Drag/drop upload still calls the existing add-files path.
- Remove buttons remove previews/files without opening the picker.
- Keyboard Enter/Space still opens the picker from the focusable dropzone.

**Validation strategy:**

- `pnpm test-headless --include="**/file-drag-host.component.spec.ts" --include="**/file-drag-host.service.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`

## Decision log

- 2026-06-17T17:55+02:00 — Reopened the upload migration as a regression task after manual macOS click validation failed. Chose a transparent full-dropzone native input over parent delegated clicks so browser file-picker activation comes from the file input itself.
- 2026-06-17T18:12+02:00 — Kept Enter/Space on the focusable wrapper as the only programmatic picker path; pointer clicks now target the native input directly, and preview/remove controls are layered so remove remains interactive without intercepting picker clicks elsewhere.
