<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Cloudflare Image Proxy and R2 Media Migration

## Status

In progress: image proxy MVP deployed, app storage URL constants point at Cloudflare on `develop`, and normal-browser/dev-server
smoke passed for module panel and rack preview surfaces. Next safe slice is an upload/compression guardrail proposal; production release, R2 migration, and Supabase cleanup remain gated. Priority: HIGH.
Product area: infrastructure / storage / image delivery.

## User intent

Supabase Free storage is becoming tight, especially from public image buckets. Before upgrading solely for image traffic,
Patcher should add free/low-cost infrastructure that reduces Supabase egress and creates a path to move bulky public media
away from Supabase Storage. `module-panels` are the largest bucket, but rack preview images live in the separate `racks`
storage bucket and should be cached/migrated deliberately too.

## Current system analysis

- Supabase Free dashboard screenshot on 2026-07-07 showed:
  - Egress: 924 MB / 5 GB.
  - Database size: 140 MB / 500 MB.
  - File storage: 585 MB / 1 GB.
- Read-only Supabase inspection on 2026-07-07 showed storage pressure is mostly `module-panels`:
  - `module-panels`: 6,235 objects, about 497 MB.
  - `racks`: 142 objects, about 39 MB.
  - `home-resources`: 11 objects, about 29 MB.
- Database pressure is mostly Price Hub tables:
  - `module_price_snapshots`: about 66 MB.
  - `module_store_listings`: about 14 MB.
- Prior bandwidth plan concluded backend queries are already well optimized; image delivery remains the main hosting-plan
  lever.
- Supabase image transformations require Pro, so Free-plan optimization should first use Cloudflare cache/R2 rather than
  Supabase transforms.

## Completed MVP checkpoint

- Added Cloudflare Worker source:
  - `cloudflare/image-proxy/src/index.ts`
  - `cloudflare/image-proxy/wrangler.jsonc`
- Deployed Worker:
  - Worker: `patcher-image-proxy`
  - Custom domain: `images.patcher.xyz`
  - Latest fixed deployed version recorded in CLI output: `00418a4b-aab2-46dc-8e2f-0efd5a15b4de`
- Updated `StorageUrls` in `src/app/features/backend/DatabaseStrings.ts` to route public storage reads through:
  - `https://images.patcher.xyz/module-panels/`
  - `https://images.patcher.xyz/racks/`
  - `https://images.patcher.xyz/manufacturer-logos/`
  - `https://images.patcher.xyz/module-collections/`
  - `https://images.patcher.xyz/patches/`
- Added targeted tests:
  - `scripts/tests/cloudflare-image-proxy.test.mjs`
  - `pnpm test:functions:cloudflare-image-proxy`
  - `DatabaseStrings.spec.ts` storage URL expectations
- Added deploy script:
  - `pnpm cloudflare:image-proxy:deploy`
- Added no-delete storage audit tooling:
  - `scripts/audits/audit-public-storage-media.mjs`
  - `scripts/tests/public-storage-media-audit.test.mjs`
  - `pnpm audit:public-storage-media`
  - `pnpm test:functions:public-storage-media-audit`
- Added browser resilience for cached image surfaces:
  - module panel cards first request `images.patcher.xyz`, then retry the direct Supabase public URL after an image `error`
    event.
  - rack preview cards follow the same proxy-first/direct-fallback flow before showing "Preview unavailable".
  - This keeps the optimized Cloudflare path as the default while avoiding blank UI from transient local DNS/browser/cache/edge
    failures during the `develop` rollout.
- Added `referrerpolicy="no-referrer"` to public storage image surfaces routed through `images.patcher.xyz`. Cloudflare hotlink
  protection can reject JPEG requests from local development when the browser sends `Referer: http://localhost:5556/`; suppressing
  the page referrer keeps local/develop image requests on the normal cached path.
- Added static regression coverage:
  - `scripts/tests/public-storage-referrer-policy.test.mjs`
  - `pnpm test:functions:public-storage-referrer-policy`
  - wired into `pnpm test:functions`
  The test scans public storage image templates and programmatic image probes so future `images.patcher.xyz` surfaces must be
  classified and must suppress referrers.

## Worker behavior

- Allowlisted buckets only:
  - `module-panels`
  - `racks`
  - `manufacturer-logos`
  - `module-collections`
  - `patches`
- Rejects unknown buckets and traversal-like path segments.
- Strips query strings before forwarding to Supabase public storage.
- For successful image responses, returns:
  - `Cache-Control: public, max-age=604800, s-maxage=2592000`
  - `Access-Control-Allow-Origin: *`
  - `X-Content-Type-Options: nosniff`
- Uses split cache TTLs intentionally:
  - Browser/client cache: one week (`max-age=604800`).
  - Shared Cloudflare cache / Worker origin fetch cache: one month (`s-maxage=2592000` and Worker `cf.cacheTtl`).
  Module panel images rarely change after upload, but the TTL is still not immutable/year-long because module panel uploads
  can overwrite filenames.

## Validation results

- 2026-07-07T16:22+02:00 — `pnpm test:functions:cloudflare-image-proxy` passed.
- 2026-07-07T16:22+02:00 — `pnpm test-headless --include="**/DatabaseStrings.spec.ts"` passed.
- 2026-07-07T16:23+02:00 — `pnpm lint` passed.
- 2026-07-07T16:25+02:00 — `pnpm build` passed.
- 2026-07-07T16:24+02:00 — public resolvers `1.1.1.1`, `8.8.8.8`, and Cloudflare authoritative nameservers resolved
  `images.patcher.xyz` to Cloudflare IPs.
- 2026-07-07T16:24+02:00 — live Worker request via resolved Cloudflare IP returned `200`, `content-type: image/webp`,
  and validated the proxy path for a real `module-panels` object.
- 2026-07-07T16:37+02:00 — final live Worker request with a fresh cache key returned `200`, `content-type: image/webp`,
  and `cache-control: public, max-age=604800, s-maxage=2592000` for a real `module-panels` object.
- 2026-07-07T16:45+02:00 — live Worker request with fresh cache keys returned `200`, correct image content types, and
  `cache-control: public, max-age=604800, s-maxage=2592000` for both `module-panels` and `racks`; unknown bucket returned
  `404`.
- 2026-07-07T16:48+02:00 — `pnpm test:functions:public-storage-media-audit` passed for the new no-delete audit helper.
- 2026-07-07T16:51+02:00 — `pnpm lint` passed after adding the audit helper.
- 2026-07-07T16:53+02:00 — final targeted validation passed:
  `pnpm test:functions:public-storage-media-audit && pnpm test:functions:cloudflare-image-proxy`, plus
  `node scripts/checks/check-docs.cjs`.
- 2026-07-07T16:49+02:00 — live `pnpm audit:public-storage-media -- --quiet` could not run locally because no
  `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_KEY` is present in this shell. Used Supabase MCP read-only SQL instead.
- 2026-07-07T16:50+02:00 — read-only storage audit snapshot:
  - `module-panels`: 6,235 objects, 497.13 MB, avg 81.65 KB, max 2.22 MB.
  - `racks`: 142 objects, 39.14 MB, avg 282.26 KB, max 0.95 MB.
  - Oversized using current audit thresholds: `module-panels` has 68 objects / 54.44 MB over 512 KB; `racks` has zero over
    1 MB.
  - Potential orphans by DB reference: `module-panels` has 53 objects / 4.36 MB not referenced by `module_panels.filename`;
    `racks` has 10 objects / 2.09 MB not referenced by `racks.image`.
- 2026-07-07T18:18+02:00 — after a local browser report of broken module/rack images, exact reported module panel files
  returned `200` through the Worker. Added proxy-first/direct-Supabase fallback for module panel and rack preview components.
  Targeted image component specs, `DatabaseStrings.spec.ts`, and `pnpm lint` passed.
- 2026-07-07T18:25+02:00 — root cause narrowed to Cloudflare hotlink/referrer protection on local development:
  `disting-ex.jpg` returned `403 error code: 1011` only when requested with `Referer: http://localhost:5556/`, and Chrome
  surfaced it as `net::ERR_BLOCKED_BY_ORB`. Added no-referrer image requests for proxied public storage surfaces. Targeted image
  specs, Worker unit tests, `pnpm lint`, docs check, and `pnpm build` passed. The already-running local `ng serve` process did
  not rebuild the template changes, so the visible browser/dev-server check requires restarting that process.
- 2026-07-07T18:28+02:00 — added and wired `public-storage-referrer-policy` static regression tests. `pnpm test:functions`
  passed with the new guard included.
- 2026-07-08T12:17+02:00 — normal-browser/dev-server smoke passed against a fresh local `pnpm start -- --port 5556` server.
  Playwright snapshots of `/modules/details/4524` and `/racks/browser` showed `images.patcher.xyz` module-panel and rack image
  requests returning `200`, with no proxy/referrer/ORB console errors.

## Known caveats

- The Worker/custom domain is live infrastructure, but the production app will not use it until a production release includes
  the `StorageUrls` change. Current published production remains on direct Supabase public storage URLs.
- Keep this on `develop` until browser/dev-server verification is complete; do not push/release solely because the Worker
  deployed successfully.
- This reduces Supabase egress pressure but does not reduce Supabase storage usage.
- Local macOS resolver still returned stale NXDOMAIN immediately after custom-domain creation; public resolvers were already
  correct. If a later agent sees local DNS failure, re-test with public resolvers before assuming deployment failed.
- Existing Supabase public storage remains the origin. Do not delete or move objects until an R2 migration is implemented and
  verified.
- Rack preview images are a separate bucket/table path from module panel images. Keep rack cache/migration checks explicit;
  do not assume module-panel validation covers rack preview behavior.
- Module and rack cards now have a direct Supabase image fallback if the Cloudflare URL fails in the browser. This is only a
  failure path, so normal successful traffic still goes through Cloudflare caching.
- Local dev images should no longer send `localhost` as a referrer after the app rebuilds. If the current local browser still
  shows `Disting EX` broken, restart the existing `ng serve --port 5556` process so it serves the updated templates.
- There are unrelated pre-existing working-tree changes in Price Hub and workflow docs. Do not revert them while continuing
  this infra task.

## Remaining MVP/structural work

- [x] Smoke-test through a fresh normal browser/dev server once local DNS cache has expired.
- [x] Smoke-test both high-priority public image paths on develop:
  - `module-panels` via module detail/browser/rack editor surfaces.
  - `racks` via rack list/detail/linked patch preview surfaces.
- [x] Add proxy-failure fallback for `module-panels` and `racks` UI cards so local/browser/edge failures do not leave the
  primary user-area cards blank while Supabase origin still works.
- [x] Suppress page referrers on proxied public storage images to avoid Cloudflare hotlink/referrer blocks during local
  development.
- [x] Add static regression coverage that fails when a new public storage image surface omits `referrerpolicy="no-referrer"` or
  when a programmatic storage image probe assigns `src` before `referrerPolicy`.
- [x] Add a no-delete storage audit for oversized, duplicate, orphaned, and non-image objects in public media buckets.
- [x] Decide whether to keep all public buckets on the proxy or limit the first app rollout to `module-panels` and `racks`.
  Keep all current public `StorageUrls` buckets on the proxy (`module-panels`, `racks`, `manufacturer-logos`,
  `module-collections`, `patches`) so existing app call sites remain centralized. Prioritize smoke/R2 migration for
  `module-panels` and `racks` because they are the current storage pressure.
- [x] Add upload-side compression/dimension guardrails before Marketplace listing media ships.
- [x] Rely on Cloudflare dashboard/manual purge for rare overwritten module-panel filenames until filenames become
  versioned/content-addressed; do not build operator purge tooling by default.
- [~] Stage the approved R2 create/copy/verify phase for `module-panels` and `racks`:
  - [x] refresh read-only inventory against the 2026-07-07 snapshot before copying
  - [x] add default-dry-run operator tooling for explicit-destination, checkpointed, no-delete copy/verify
  - [!] create R2 bucket(s), copy current objects, and verify parity — destinations are approved; blocked until
        Cloudflare/R2/Supabase credentials are configured
  - [ ] switch Worker origin lookup for `module-panels`, then `racks` only after separate approval
  - [x] leave Supabase files intact during the staging phase
  - [ ] only then propose Supabase cleanup after separate approval
- [ ] Revisit immutable/year-long TTL after filename versioning/content-addressing is solved.

## R2 migration runbook draft

This is the next cost/storage lever after the Cloudflare cache proxy. It is deliberately a proposal/runbook only until the
operator approves creating R2 buckets and copying data.

### Target order

1. `module-panels` first because it is the largest bucket and the strongest storage-pressure source.
2. `racks` second because rack previews are user-generated and separately referenced by `public.racks.image`.
3. Defer `manufacturer-logos`, `module-collections`, and `patches` until the first two buckets prove the path.

### Safety model

- R2 migration must be additive first: copy to R2, verify, switch reads, observe, then propose Supabase cleanup.
- Do not delete Supabase objects during the first R2 switch.
- Keep the Worker as the single image URL surface; app code should keep using `StorageUrls`, not learn whether a bucket is
  Supabase- or R2-backed.
- Rollback is DNS/code-free while Supabase files remain: change Worker bucket routing back to Supabase and redeploy.

### Copy and parity checks

- Export object inventory from Supabase per bucket:
  - object name
  - byte size
  - MIME type
  - ETag / checksum metadata when available
- Copy exact object names into matching R2 prefixes or buckets.
- Verify:
  - object count parity
  - byte total parity
  - sample content-type parity
  - top oversized files present
  - random sample HEAD/GET through Worker
- Keep a timestamped inventory artifact outside the repo or under `output/` if generated locally.

### Approved staging operator tooling

- Script: `pnpm r2:stage-public-media`.
- Default behavior is dry-run; real writes require `--execute`.
- Required explicit destination naming:
  - `R2_BUCKET_MODULE_PANELS=patcher-module-panels`
  - `R2_BUCKET_RACKS=patcher-rack-previews`
- Required credentials/config for real staging:
  - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY` for storage inventory.
  - `CLOUDFLARE_ACCOUNT_ID` plus `CLOUDFLARE_API_TOKEN` for `--execute --create-buckets`.
  - `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (or AWS-compatible aliases) for `--execute --copy` and `--execute --verify`.
- Safety behavior:
  - preserves source object keys and content types
  - writes only to the explicit R2 destination
  - serializes execute-mode copy writes (`--concurrency=1`) so the run fails before scheduling additional object writes
  - refuses to overwrite a destination object unless it is byte-equivalent/idempotent
  - stores checkpoint records by hashed key identifier, not raw object name
  - verifies destination key, byte, content-type, and SHA-256 parity before considering a copied object complete
  - writes aggregate summary/verification reports under `output/r2-public-media-staging`
  - requires `--allow-sample-execute` before an execute-mode sampled run, so a partial sample cannot be mistaken for full parity

### Current staging inventory

Read-only Supabase MCP snapshot on 2026-07-17T12:03+02:00, compared to the 2026-07-07 runbook snapshot:

| Bucket | Current objects | Current bytes | Current MB | 2026-07-07 objects / MB | Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| `module-panels` | 6,240 | 521,486,743 | 497.33 | 6,235 / 497.13 | +5 objects, +0.20 MB |
| `racks` | 142 | 41,042,929 | 39.14 | 142 / 39.14 | no material change |

Additional non-secret checks from the same snapshot: both buckets have zero missing-size rows and zero non-image MIME rows;
`module-panels` still has 68 objects over 512 KB totaling 57,089,710 bytes, while `racks` still has zero objects over 1 MB.
No Supabase objects were modified or deleted during this staging attempt.

### Worker routing direction

- Keep `images.patcher.xyz/{bucket}/{file}` stable.
- Add optional R2 bindings per bucket only after R2 buckets exist.
- Route `module-panels` to R2 first while leaving all other buckets on Supabase origin.
- Route `racks` to R2 only after module-panel rollout is stable.

### Cleanup gate

Supabase cleanup requires explicit maintainer approval after:

- at least one observation window with no broken images
- parity report reviewed
- rollback path confirmed
- production release has been verified if production is using the proxy

## Upload/compression guardrail proposal

Actionable, maintainer-reviewable local plan for future upload-side compression and dimension guardrails. This section is
**docs/planning only** for the current loop. No upload behavior, thresholds, backend, schema, RLS, storage, or production
release changes are enforced until the maintainer approves the questions in "Approval questions and recommended defaults"
below.

### Current upload code paths (as of 2026-07-08)

Reviewed to identify the smallest future implementation seam without changing today's behavior.

1. **Module panels** (largest storage pressure).
   - UI entry: `src/app/components/module-parts/module-editor/module-editor.component.html` uses
     `<lib-file-drag-host [isImageOnlyMode] [multipleFilesMode]=false acceptedFileType="image/jpeg,image/jpg,image/png,image/webp">`
     for the raw file drop, then feeds a cropper section and a final preview.
   - Component wiring: `src/app/components/module-parts/module-editor/module-editor.component.ts` reads
     `fileDragHostService.files$`, drives preview/crop state, then `onPanelImageCropped` builds `croppedPanelFile$` from the
     cropper output. `persistAllChanges$` finally passes `croppedPanelFile$.value` into the module-editor data service.
     Current crop output: `panelCropOutputQuality = 95` and WebP preferred when the browser supports it.
   - Cropper: `src/app/components/module-parts/module-editor/module-editor-cropper.component.ts` wraps `ngx-image-cropper`
     with `[output]="'blob'"`, `[format]`, `[imageQuality]`, `[onlyScaleDown]=true`, and a min crop of 120.
   - Data service seam: `src/app/components/module-parts/module-editor/module-editor-data.service.ts` — `buildCroppedPanelFile`
     wraps the crop blob in a `File`, and private `savePendingPanel$` reads `file.arrayBuffer()`, builds the filename, calls
     `backend.storage.uploadModulePanel(fileBuffer, filenameAndExtension, file.type)`, then `backend.add.panel`.
   - Backend surface: `src/app/features/backend/supabase-storage.ts` — `uploadModulePanel(file, filenameAndExtension,
     contentType='image/jpeg')` uploads with `upsert` to `DbStoragePaths.module_panels`.

2. **Rack previews** (app-generated, not user file uploads).
   - `src/app/components/rack-parts/rack-detail-data.service.ts` — `generateRackJpegWithoutAnalysisOverlays$` produces a
     `Blob` with `type: 'image/jpeg'`, then calls `backend.storage.uploadRackImage`.
   - Backend surface: `uploadRackImage` in `supabase-storage.ts`.

3. **Marketplace/listing media** — not implemented; must not be shipped without guardrails from day one (see
   "Non-goals and gates" below).

Key implication: for module panels there is a single, well-scoped seam — the `croppedPanelFile$` output plus the
`savePendingPanel$` upload step in `module-editor-data.service.ts`, plus the pre-crop file selection at
`fileDragHostService.files$` in `module-editor.component.ts`. Any future client-side size/dimension guardrail can plug in at
those two points without touching `SupabaseService` or backend schema.

### Approved implementation seam

The thresholds and UX below are approved for frontend implementation. R2 migration and existing-object cleanup remain
separately operator-gated.

- Introduce a small, pure helper (future PR, not this loop) that inspects a candidate `File`/`Blob` and returns a structured
  advisory result: `{ ok, warnings[], blocked, reason?, measuredBytes, measuredWidth?, measuredHeight? }`.
  - Location proposal: `src/app/shared-interproject/upload-guardrails/` (new folder), pure function, no Angular DI, no
    Supabase, no side effects. Keeps the API service / data service / component layering rules from `AGENTS.md` §4 intact.
  - Consumers: `module-editor.component.ts` (raw pre-crop `File`) and `module-editor-data.service.ts` (post-crop `File`
    inside `savePendingPanel$` before the `backend.storage.uploadModulePanel` call).
- Enforce the approved module-panel thresholds through the helper and require explicit confirmation before uploading a
  still-oversized panel.
- Rack previews consume the same measurement helper and stop before upload when the generated image exceeds 1 MB.
- No runtime flag is required for these approved frontend limits. R2 migration and existing-object cleanup remain separately
  gated.

### Approval questions and recommended defaults

Maintainer decisions required before any enforcement PR. All seven decisions were approved on 2026-07-17.

1. **Max module-panel file size after crop** — approved: **512 KB** (matches the existing audit threshold; 68/6,235
   current objects are above it, so this catches the visible outliers without touching typical uploads). Alternatives worth
   naming: 384 KB (aggressive), 768 KB (conservative).
2. **Max module-panel output dimensions** — approved: **max 5000 px on the long edge** for module panels, with
   `onlyScaleDown = true` already applied by the cropper.
3. **Output format preference** — approved: **keep the current WebP-preferred-with-JPEG-fallback flow** already in
   `module-editor.component.ts` (quality 95). Add a soft downgrade to 90 only for files still above the size threshold after a
   first encode pass. Do not silently over-degrade artwork.
4. **User feedback when a file exceeds the threshold** — approved: **inline warning + explicit "compress anyway"
   confirmation**, not a hard block. Escape-hatch preserves rare high-detail panels while nudging most uploads under the
   threshold.
5. **Rack preview enforcement** — approved: **hard limit at 1 MB**.
6. **Existing oversized objects** — approved: **no automatic re-upload/recompression**. Any cleanup remains a
   maintainer-approved batch task later, per the existing "no-delete storage audit" direction in the Decision log.
7. **Marketplace/listing media constraints** — approved baseline: define image-count, pre-processing file-size, and output-
   dimension limits; strip EXIF; use JPEG/WebP only; exclude hosted audio/video from MVP; and use the image proxy/R2 path from
   day one. Marketplace implementation remains out of scope here.

### Implementation checklist

Ordered so each step is independently reviewable and preserves layering rules from `AGENTS.md`.

- [x] Maintainer answers the seven questions above; thresholds/UX approved.
- [x] Add pure helper module `src/app/shared-interproject/upload-guardrails/` with unit tests for the approved limits.
- [x] Wire the helper into `module-editor.component.ts` on the pre-crop `File` and into `module-editor-data.service.ts` on the
      post-crop `File`.
- [x] Add targeted unit specs alongside `module-editor-data.service.ts` covering measurement, compression, confirmation, and
      stale async result handling.
- [x] Enforce the inline warning + "compress anyway" confirmation for still-oversized module panels.
- [x] Enforce the approved 1 MB hard limit in the current rack preview media service.
- [ ] Capture authenticated runtime/Playwright evidence for the warning path once the module-detail 406 loading-shell issue is
      resolved; component/DOM regression specs cover the integrated behavior meanwhile.
- [ ] Only after enforcement is stable on `develop`, propose a maintainer-reviewed cleanup pass for the 68 existing oversized
      `module-panels` objects. This remains gated with the existing R2 migration cleanup gate.

### Validation strategy

For the seam / advisory-only PR (not this loop):

- `pnpm lint`
- `pnpm test-headless --include="**/module-editor-data.service.spec.ts"` (add if missing) and
  `**/upload-guardrails*.spec.ts`.
- `node scripts/checks/check-docs.cjs`
- Manual smoke: upload a small JPEG, a large JPEG, and a large PNG through the module editor on `develop`; confirm the
  advisory log fires and the upload still succeeds with identical bytes to a pre-seam baseline.

For the enforcement PR (later):

- Above, plus Playwright coverage of the warning + "compress anyway" UX in `src/app/components/module-parts/module-editor/`.
- Re-run `pnpm audit:public-storage-media` after a few real uploads land on `develop` to confirm new objects respect the
  threshold.
- No backend/schema/RLS changes, so no `updateBackendTypes` or advisor run is required.

### Non-goals and gates

- No changes to `SupabaseService`, `supabase-storage.ts`, backend schema, RLS, or storage buckets in this loop or in the
  advisory-only PR.
- No enforcement of any size/dimension threshold until the maintainer approves the seven questions above.
- No automatic recompression or deletion of the 68 existing oversized `module-panels` objects.
- No Marketplace/listing media implementation. When it eventually ships, it must land with:
  maximum image count per listing, maximum accepted file size before processing, max output dimensions, EXIF stripping,
  JPEG/WebP output decision, no hosted audio/video in MVP, and it must reuse the image proxy / R2 path from day one instead of
  adding another Supabase-heavy public bucket without cache/migration strategy.
- No production release, no push, no force-push. This proposal must remain reviewable on `develop`.

## Non-goals

- No Supabase deletion during the image proxy checkpoint.
- No R2 migration in the same step as the Worker deploy.
- No Supabase plan downgrade/upgrade automation.
- No backend schema/RLS changes.
- No Marketplace media implementation.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-07-08T15:35+02:00 — Staged as the next coordinator-loop task after Price Hub frontend cleanup. Safe scope is proposal/planning for upload-side compression and dimension guardrails only; do not create R2 buckets, copy/switch/delete storage objects, enforce maintainer-facing upload thresholds, release production, or push without explicit approval.
- 2026-07-07T16:12+02:00 — User approved Cloudflare Worker deployment via Wrangler browser login instead of an API token.
- 2026-07-07T16:18+02:00 — First deploy uploaded Worker but failed to publish because `workers_dev` was enabled while no workers.dev subdomain existed; config was changed to `workers_dev: false`.
- 2026-07-07T16:19+02:00 — Worker deployed successfully to custom domain `images.patcher.xyz`.
- 2026-07-07T16:22+02:00 — Cache TTL reduced from one year/immutable to 24h because module panel filenames can be overwritten; keep immutable caching behind a future versioned-filename checkpoint.
- 2026-07-07T16:27+02:00 — Production rollout explicitly gated: live production keeps direct Supabase URLs until the
  `StorageUrls` change is released after browser/dev-server verification.
- 2026-07-07T16:28+02:00 — User approved increasing Worker cache TTL from 24h to one week because module images are rarely updated after upload. Deployed Worker version `853a42e5-1a96-452c-a1f0-bce4cd948790`; fresh cache keys return `Cache-Control: public, max-age=604800`, while objects already cached under the previous deploy may keep the old 24h header until they expire.
- 2026-07-07T16:35+02:00 — Split browser/client and shared-cache TTLs: browser remains one week, Cloudflare shared cache and Worker origin fetch cache move to one month (`2592000`) as the first longer-cache step. Final fixed deployed Worker version: `00418a4b-aab2-46dc-8e2f-0efd5a15b4de`; live fresh-cache response returns `Cache-Control: public, max-age=604800, s-maxage=2592000`.
- 2026-07-07T16:42+02:00 — User explicitly confirmed rack preview images must also be cached. They are already routed through the deployed `racks` allowlist/base URL, but follow-up smoke/R2 work must track the separate `racks` storage bucket explicitly instead of treating module panels as the only target.
- 2026-07-07T16:50+02:00 — No-delete audit direction clarified: do not delete or migrate from the orphan/oversized findings
  autonomously. The safe next optimization is a compression/re-upload proposal for the 68 oversized module panels and a
  maintainer-reviewed cleanup proposal for the small orphan set.
- 2026-07-07T18:18+02:00 — Local browser breakage report diagnosed against exact screenshot module filenames; Worker returned
  valid image responses, so app-side proxy-failure fallback was added for module panels and rack previews without changing the
  default Cloudflare-optimized path.
- 2026-07-07T18:25+02:00 — Chrome ORB failure traced to Cloudflare returning `403 error code: 1011` for proxied JPEGs when the
  request includes the local dev `Referer`. Keep `referrerpolicy="no-referrer"` on all `images.patcher.xyz` storage image
  elements unless Cloudflare hotlink protection is explicitly reconfigured.
- 2026-07-07T18:28+02:00 — Added static no-referrer regression test and included it in `pnpm test:functions` so Cloudflare
  referrer/hotlink regressions are caught before release.
- 2026-07-08T12:17+02:00 — Fresh local dev-server browser validation completed for module detail and rack browser image paths.
  This clears the develop smoke checkpoint; R2 bucket creation/copy/switch/cleanup and any production release remain explicitly
  operator-gated.
- 2026-07-08T14:13+02:00 — User chose Cloudflare dashboard/manual purge for rare overwritten module-panel filenames. Do not build an operator-only purge path unless manual purge becomes painful; revisit immutable/year-long TTL after filename versioning/content-addressing.
- 2026-07-08T15:35+02:00 — Expanded the upload/compression guardrail proposal into an actionable local plan (current upload paths, no-behavior-change seam under `src/app/shared-interproject/upload-guardrails/`, seven maintainer approval questions with recommended defaults grounded in the 2026-07-07 audit snapshot, future implementation checklist, validation strategy, non-goals/gates). Docs/planning only; no upload behavior, storage, backend, schema, RLS, production release, or remote-object changes. R2 migration/copy/switch/cleanup and enforcement of any upload threshold remain operator-gated.
- 2026-07-17 — Product owner approved all seven upload-guardrail decisions: 512 KB post-crop module-panel threshold, 5000 px long edge, WebP/JPEG quality 95→90 fallback, inline "compress anyway" confirmation, a hard 1 MB rack-preview limit, no automatic recompression of existing objects, and the full Marketplace media baseline. R2 migration/copy/switch/cleanup remains separately operator-gated.
- 2026-07-17 — Product owner approved the staged R2 create/copy/verify phase only. Do not switch traffic, clean up source objects, or delete any Supabase object without another explicit approval.
- 2026-07-17T12:03+02:00 — R2 staging started from exact develop commit `45efeef0`. Refreshed read-only Supabase inventory:
  `module-panels` has 6,240 objects / 521,486,743 bytes and `racks` has 142 objects / 41,042,929 bytes. Added safe
  default-dry-run R2 staging tooling and tests. Real bucket creation/copy/verification did not run because this shell has no
  configured `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SERVICE_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, or explicit `R2_BUCKET_MODULE_PANELS`/`R2_BUCKET_RACKS` destination names.
  No traffic switch, Worker routing change, production release, cleanup, source overwrite, or Supabase object deletion occurred.
- 2026-07-17 — Product owner approved `patcher-module-panels` and `patcher-rack-previews` as the explicit R2 destination bucket
  names. Real create/copy/verify remains blocked only on local credential configuration.
- 2026-07-17 — Integrated frontend upload guardrails in commit `80c9a3ef`: module-panel measurement/compression plus explicit
  still-oversized confirmation, stale compression race protection, and a 1 MB rack-preview hard limit. Focused specs pass;
  authenticated runtime rendering remains blocked by the existing module-detail 406 loading shell.
- 2026-07-17T12:26+02:00 — Resumed the approved create/copy/verify stage from local commit `ec3ea426`. The shell still has no
  configured `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SERVICE_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
  `R2_ACCESS_KEY_ID`, or `R2_SECRET_ACCESS_KEY`, so no R2 bucket creation/copy/verification was attempted. Tightened the
  operator script so execute-mode preflight reports the full missing non-secret config list before any inventory fetch. No
  traffic switch, Worker routing change, production release, cleanup, source overwrite, or Supabase object deletion occurred.
