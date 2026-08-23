# Vercel CI Gate

This project uses Vercel's **Ignored Build Step** as a CI gate for automatic Vercel Git deployments.

## Why this exists

Vercel starts preview/production builds immediately when GitHub pushes a commit. GitHub branch protection does not stop
that build; it only controls merges. We want:

- `develop` preview builds only after the `Angular Tests` workflow passes.
- `production` builds only after the same checks pass.
- docs-only changes to skip Vercel builds.

Vercel deploy hooks were not usable here, and GitHub Actions-owned Vercel CLI deploys would require adding Vercel deploy
credentials to GitHub. The current solution keeps Vercel's normal Git integration and makes the ignored-build script wait
for GitHub Actions.

## Moving parts

- `vercel.json` sets `"ignoreCommand": "bash scripts/build/vercel-ignore-build.sh"`.
- `scripts/build/vercel-ignore-build.sh` is intentionally shell-only. Do not rely on `node`, package installs, or project
  dependencies; the ignored-build step runs before the Vercel install/build phase.
- Vercel must have a project environment variable named `GITHUB_TOKEN` enabled for **Preview** and **Production**.

## Required Vercel environment variable

`GITHUB_TOKEN` should be a fine-grained GitHub personal access token scoped to `Polyterative/Patcher` with read-only
permissions:

- Actions: Read
- Checks: Read
- Contents: Read

Without this token, Vercel's shared build IPs can hit unauthenticated GitHub API errors/rate limits and the gate may never
see the workflow result.

## Script behavior

The script follows Vercel ignored-build exit semantics:

- exit `0` = skip/cancel the deployment
- exit `1` = proceed with the deployment

Flow:

1. Skip docs-only / `.github`-only changes. For a `standard-version` release
   commit immediately following the develop-to-production merge, evaluate the
   cumulative diff from the previous production tip so merged application
   changes cannot be mistaken for a metadata-only release.
2. Poll the GitHub Actions workflow-runs API for `.github/workflows/angular-tests.yml` at the exact pushed SHA.
3. Proceed only when that workflow reports `status=completed` and `conclusion=success`.
4. If the workflow endpoint is temporarily unavailable, fall back to required check-runs:
   - `Lint`
   - `Stylelint`
   - `Unit tests`
   - `Function tests`
   - `Production build + smoke`
5. Failed checks, missing checks, API errors that never recover, or timeout all skip the deploy.

## Known sharp edges

- This is a pragmatic workaround, not the cleanest CI/CD architecture.
- Every eligible Vercel deployment waits inside the ignored-build step until GitHub Actions finishes.
- Keep the required check-run names in sync with `.github/workflows/angular-tests.yml`.
- If Vercel logs `GitHub API auth source: none`, the `GITHUB_TOKEN` env var is not available to that deployment
  environment.
- If Vercel logs `api_error` repeatedly with a token present, check the logged GitHub response message/prefix and token
  permissions.

## Cleaner future option

The more conventional architecture is GitHub Actions-owned deploys:

1. GitHub Actions runs tests.
2. A deploy job with `needs: tests` runs Vercel CLI.
3. Vercel automatic Git builds are disabled/skipped.

That requires GitHub secrets such as `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. If we adopt that later,
remove the `ignoreCommand` gate and this runbook can be archived.
