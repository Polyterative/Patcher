<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Replace deprecated ngx-dropzone

**Status:** In progress.

**Why:** `ngx-dropzone` is deprecated and no longer receives updates, so upload UI should move to a maintained option or a small native drag/drop implementation.

## Problem

The shared `lib-file-drag-host` upload primitive imports `ngx-dropzone`, so every image/file upload flow carries a deprecated package even though the required behavior is small: click to pick files, drag/drop files, validate accepted types, preview selected files, remove files, and support single-file replacement.

## Goals

- Remove all source imports and template tags from `ngx-dropzone`.
- Replace the UI with repo-owned Angular/DOM code and SCSS.
- Preserve the existing `FileDragHostService` public event flow enough that adjacent upload surfaces do not need rewrites.
- Remove `ngx-dropzone` from `package.json` and `pnpm-lock.yaml`.

## Assumptions

- A native file input plus drag/drop handlers is sufficient; no new dependency is needed.
- Existing `acceptedFileType`, `multipleFilesMode`, and `isImageOnlyMode` inputs define validation and preview behavior.
- Browser `DataTransfer.files` / `HTMLInputElement.files` support covers current upload surfaces.

## Layers

### MVP

- Replace `<ngx-dropzone>` / preview tags with a native clickable dropzone and hidden file input.
- Convert dropped or picked files into the service's existing add-file stream.
- Preserve single-file replacement, multi-file append, remove-file, and rejected-file snackbar behavior.

### Structural

- Remove `NgxDropzoneModule` imports and `NgxDropzoneChangeEvent` types.
- Introduce a local file-add event interface or method owned by `FileDragHostService`.
- Remove `ngx-dropzone` from dependency manifests.

### Polish

- Preserve clear empty-state copy and icons.
- Provide keyboard activation, focus styles, and image previews.
- Keep tests focused on service validation and manifest/source removal.

## File-level checklist

- [ ] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.component.ts`
- [ ] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.component.html`
- [ ] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.component.scss`
- [ ] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service.ts`
- [ ] `src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service.spec.ts`
- [ ] `package.json`
- [ ] `pnpm-lock.yaml`

**Success criteria:**
- Upload flows work without `ngx-dropzone`.
- Dependency is removed from `package.json` and lockfile.
- `grep`/`rg` finds no source import or template usage of `ngx-dropzone`.

## Acceptance criteria

- Selecting files through the picker emits the same file pool updates as before.
- Dragging accepted files onto the host adds/replaces files according to multi vs single mode.
- Dragging/picking rejected files shows the existing "File not accepted" snackbar and does not mutate the file pool.
- Removing selected files still updates `files$`.
- Image-only mode shows image previews without `ngx-dropzone-image-preview`.

## Validation strategy

- `pnpm install --lockfile-only`
- `pnpm test-headless --include="**/file-drag-host.service.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`

## Decision log

- 2026-06-15 — Added as a low-priority follow-up after dependency deprecation review.
- 2026-06-17T17:56+02:00 — Coordinator selected this as the loop task because higher-priority open tasks are blocked on external approval/secrets or are too broad for one verified cycle.
