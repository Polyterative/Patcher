# Documentation Lifecycle

Canonical workflow for keeping Patcher's internal and public documentation aligned
with completed and released product work.

## Repositories and authority

- `Patcher/internaldocs/` documents plans, architecture, decisions, and workflow state.
- `Patcher-docs` is the public GitBook source for behavior available to production users.
- `develop` is not production. A feature completed on `develop` must not be described as
  publicly available until its production release and production visibility are confirmed.
- Public-documentation work that spans both repositories uses the `orchestrate` skill and the
  [`docs-publisher`](../agents/docs-publisher.md) persona.
- Agents may create reviewed local commits, but never push either repository without an explicit
  user request in the current turn.

## Three delivery states

1. **Completed on develop**
   - implementation, review, and validation are complete;
   - internal workflow docs are archived normally;
   - public-facing impact is placed in the Public docs queue in
     [`TODO.md`](./TODO.md);
   - public docs do not yet claim the feature is live.
2. **Published to production**
   - the user has confirmed the release/production deployment;
   - any production feature flag or operator gate is confirmed enabled;
   - the queue entry can move to `Published; docs pending`.
3. **Documented publicly**
   - affected prose, navigation, contracts, and screenshots in `Patcher-docs` are updated;
   - an independent factual/visual review has passed;
   - the local docs commit is ready for an explicitly requested push;
   - the queue entry is removed and the source plan records the docs commit.

## Required plan block

Every new feature plan, and every existing plan before it is completed, must contain:

```markdown
## Documentation impact

- Classification: none | internal-only | public-behavioral | public-visual | public-contract
- Production visibility: immediate | feature-flagged `<flag>` | operator-gated
- Public docs paths: `path`, `path` | none
- Screenshot targets: `home`, `modules`, ... | none
- Changelog summary: <one user-facing sentence> | N/A
```

Classifications:

- `none`: no durable documentation change.
- `internal-only`: plans, architecture, operations, or contributor guidance only.
- `public-behavioral`: user-visible behavior, workflow, routing, permissions, or limits.
- `public-visual`: a public UI surface or one of the canonical docs screenshots changes.
- `public-contract`: API, URL, export, share-link, compatibility, or machine-readable contract.

Do not mass-backfill untouched historical plans. Add the block whenever an existing active/backlog
plan is next edited, and always before its completion archive.

## Loop responsibilities

### Planning and intake

- `planner` and `feature-notetaker` classify documentation impact before handoff.
- Public impact names likely `Patcher-docs` pages and screenshot targets up front.
- `public-contract` plans identify the authoritative generated contract instead of proposing
  hand-maintained endpoint tables.
- `reviewer` checks that the classification matches the implemented behavior.

### Completion on develop

`coordinator-loop` and `autonomous-engineer`:

1. update internal docs and the plan Decision log;
2. draft the changelog summary in the plan rather than editing release-generated changelog output;
3. archive the plan/TODO entry normally;
4. for any `public-*` classification, add one thin Public docs queue entry under
   `Completed on develop; awaiting production publication`;
5. do not edit `Patcher-docs`, regenerate public screenshots, switch to `production`, or release.

Queue entry format:

```markdown
- [ ] <Feature> — `<classification>`; [plan](./plans/done/<slug>.md);
  docs: `<paths>`; screenshots: `<targets|none>`; release evidence: pending
```

### Publication

Publication documentation begins only after the user confirms that the feature is deployed to
production. Before invoking `docs-publisher`, verify:

- the implementation commit is reachable from `production` or the confirmed release tag;
- production flags/operator gates expose the feature;
- the queue entry has moved to `Published; docs pending`;
- both repositories' current changes are understood and will not be overwritten.

If a production flag remains off, move/keep the entry under
`Published but documentation-blocked` and do not present the capability as live.

## Public documentation workflow

The coordinator delegates one bounded `docs-publisher` task:

1. Read the queue entry, archived plan, production implementation, and affected public pages.
2. If screenshots are affected, run the relevant targets from
   [`../testing/DOCS_SCREENSHOTS.md`](../testing/DOCS_SCREENSHOTS.md), inspect every affected image
   in-session, and pass the documented manual review gate.
3. Run `pnpm sync:docs-screenshots -- --dry-run` before mutating a clean sibling docs checkout.
4. Update affected prose, navigation, assets, and generated contract references.
5. Check links, image references, factual claims, feature flags, and `git diff --check`.
6. Delegate an independent docs review; visual changes require image-by-image review.
7. After findings are resolved, create one coherent local docs commit if the coordinator delegated
   commit authority.
8. Record the docs commit in the archived feature plan, remove the queue entry, and stop.

The workflow never runs release commands, changes backend data, force-pushes, or pushes docs
autonomously. A dirty `Patcher-docs` checkout must be understood and reconciled explicitly; never
stash, reset, or overwrite unknown work to satisfy the screenshot sync guard.

## Definition of done

A public-impact feature is fully delivered only when:

- implementation is complete and released;
- production visibility is confirmed;
- public prose/contracts are current;
- affected screenshots are current and manually approved;
- an independent docs review passed;
- local commits exist in the appropriate repositories;
- no undocumented queue entry remains.
