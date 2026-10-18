# Data quality: sources, change history and site policies

Goal: every module record is entered from sources the contributor names, every field cites at least one of
them, every change to the catalogue is recorded, users can download their own data at any time, and the
site has a clear policy set (terms, privacy, cookies, contribution, data licence, notice and takedown).

Status: **DRAFT (2026-10-18), nothing implemented.** Stage 1 is code-only. Stages 2 and later need the
`backend-plan-reviewer` gate and explicit owner approval for any RLS change (`AGENTS.md` §5).

## Path at a glance

1. "Download my data", policies, privacy fixes and copy review (code only).
2. References model and change history (DB, gated).
3. New submit/edit page built around references, with a review queue.
4. Display: "Data & sources" panel, history and reporting on module pages.

## Layer 1 — MVP

### Stage 1 — Download my data, policies, privacy and copy (code only, no schema)

- [ ] "Download my data" in account settings: racks, patches, collections and owned modules as JSON and CSV. Each module row carries its name, manufacturer and HP so a rack can be rebuilt from the file alone.
- [ ] Per-rack export (JSON) next to the existing image download.
- [ ] Policy pages at `/legal/*`, versioned (id, version, effective date, old versions stay reachable): Terms, Privacy, Cookies, Contribution & Sourcing, Contributor Licence, Data Licence, Notice & Takedown, Imprint.
- [ ] Footer "Legal" column and FAQ entries ("Where does the data come from?", "How do I report content?", "How do I download my data?").
- [ ] Signup checkbox: accept Terms and Privacy (versioned); one-time interstitial for existing users before any catalogue write.
- [ ] Scope licence statements (`cloudflare/public-api/README.md`, `src/llms.txt`, README "AI & Open Data Stance") to data with a recorded licence.
- [ ] Review homepage and SEO copy for unsupported statements (e.g. catalogue size) and correct them.
- [ ] `analytics.service.ts`: stop sending the user email to PostHog in `identify()`.
- [ ] Sentry replay: explicit `maskAllText` / `blockAllMedia`; consider lower prod traces.
- [ ] Decide PostHog cookieless vs consent banner (recommended: cookieless), document in Privacy.
- [ ] Independent review of policy texts before they reach production.

## Layer 2 — Structural

### Before any migration

- [ ] Verified full database backup (restore tested or checksum recorded) before every migration.

### Stage 2 — References model and change history (DB)

Gate: `backend-plan-reviewer` first; additive only.

Model: each module has a **reference list** managed separately from its fields. A reference is either a
URL (manufacturer page, manual, press kit, own photo upload) or **"own knowledge of @user"** (stored with
the user and date, shown publicly). **Every field cites at least one reference**: name, manufacturer,
description, HP, depth, power values, each input/output row, and the **panel image has its own reference**.

- [ ] `module_references`: module, kind (url / own_knowledge), url, quoted passage, user, date, note.
- [ ] `module_field_citations`: field or child row (I/O row) to reference ids.
- [ ] Panel image reference column on `module_panels` (plus uploader).
- [ ] `catalogue_audit_log`: append-only, trigger-written (who, when, what, why), hash chain, no UPDATE/DELETE for anyone. Covers creates, edits and removals.
- [ ] `contribution_attestations`: user, context, entity, policy version, wording hash (no IP or user agent).
- [ ] `policy_acceptances` and `content_reports` (admin-only, timestamps for receipt and decision).
- [ ] Server-set `updated` / `updated_by` (trigger); backfills never touch `updated`.
- [ ] Restrict "any user can edit any module" (`modules_update_authenticated`): RLS plus owner approval queue.

### Stage 3 — New submit/edit page (flag `sourcedContributionFlowEnabled`)

Needs a designer placement brief approved by the owner before coding. Covers add, editor, inline edits, merge, panel upload.

- [ ] Step 1: add references (URL, or "from my knowledge").
- [ ] Step 2: fill fields, each with a source picker drawn from the module's reference list.
- [ ] Image upload requires its own reference; no reference, no upload.
- [ ] Fields without a source block submit (inline error pointing to the Contribution Policy).
- [ ] Attestation checkbox: "I entered this myself from the sources listed; I have the right to share it."
- [ ] Edit flow: same page plus "what changed and why"; reason is written to the audit log.
- [ ] Review queue: new records and edits are checked against their cited sources before they are published.
- [ ] Tests: submit blocked without source, flag gating, attestation required.

## Layer 3 — Polish

### Stage 4 — Sources, display and reporting

- [ ] Sourcing standard: values come from manufacturer pages, manuals and press kits; each is backed by a quoted passage, the date and the reviewer. A URL alone is not enough; the quote must contain the value.
- [ ] Manufacturer-licensed images and specs (CSV / press kit), with explicit terms per image.
- [ ] Schematic panel renderer for records without a sourced image (one house style, sourced specs only).
- [ ] Owner confirmation in racks: users confirm HP, power and I/O for modules they own.
- [ ] "Data & sources" panel on module detail (designer brief and owner sign-off on placement first).
- [ ] Per-module change history ("View history" disabled, "Coming soon", until stage 2 lands).
- [ ] Panel image credit line and "Report a problem" link.
- [ ] Takedown handling: a reported record is reviewed against its sources; the decision, date and reason go to the audit log, and users with the record in a rack are told.
- [ ] Admin provenance report export (history, references, attestation, policy version, report log).
- [ ] Update licence statements once records carry a recorded licence.

## Gates

- `backend-plan-reviewer` before any schema, column, RPC or migration.
- RLS and storage-policy changes need explicit owner approval each.
- Nothing is pushed, deployed or released without owner consent.

## Open decisions

- Whether "own knowledge" alone is enough for a field, or needs a second source.
- Outbound data licence (CC BY 4.0, ODbL or CC0).
- Operator identity for Terms/Privacy/Imprint (person or company, which address).
- Show contributor usernames on module pages?
- Sources required on every edit, or only for spec/description/image fields?
- Export formats beyond JSON and CSV.

## Decision log

- 2026-10-18: Sources are not stored in `modules.additional` JSON: unqueryable, overwritten by any edit, no history.
- 2026-10-18: Attestations store no IP or user agent (data minimisation).
- 2026-10-18: Field-level citations chosen over per-module sources: each value is individually checkable.
- Backend review verdict to be recorded here before stage 2.

## Documentation impact

- Classification: public-behavioral + public-visual + public-contract; feature-flagged `sourcedContributionFlowEnabled`, DB items operator-gated.
- Public docs stay silent until production publication is confirmed (`DOCUMENTATION_LIFECYCLE.md`). Screenshot targets: `modules`, `module detail`, `add module`, `account settings`.
