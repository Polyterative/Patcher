# Release Process

Primary branch is `develop`; release branch is `production`.
Use `pnpm merge:dev-to-prod`, then run `pnpm release:patch|minor|major` only from `production`.
The release preflight must pass before versioning/tagging; pushes are atomic so tags cannot publish without the branch.
After publishing, bring release-tooling changes back to `develop` without preserving temporary reconciliation commits.
If commit counts or ancestry look inflated, stop and inspect before pushing.
