# Public API contract handoff — self-host move (DRAFT)

> Exit gate of the self-host move (detailed plan kept in local, gitignored `internaldocs/private/`). DRAFT for review — no apply, no key
> material, no consumer migration happens off this file. The move carries the
> `api_v1` public API to the new home; external consumers must keep working with
> NO key reissue when `api_key_pepper` is carried verbatim.
>
> Sources (repo-only, no DB touch):
> `supabase/migrations/20260724133100_api_reader_roles.sql`,
> `20260724133200_api_identity.sql:65-69,344-355`,
> `20260724133300_api_v1_views.sql`,
> `20260724133400_api_vault_permissions.sql`,
> `cloudflare/public-api/RUNBOOK.md`.

## Contract surface (authoritative names)

- Roles: `api_view_owner` (NOLOGIN owner of the security-barrier views; narrow
  base-column grants only) + `api_reader` (NOLOGIN reader; credentials are NOT
  created in repo — LOGIN remains a separately approved runbook step).
- Views (`public.api_v1_*`, security-barrier, owner `api_view_owner`):
  `api_v1_modules`, `api_v1_manufacturers`, `api_v1_standards`, `api_v1_tags`,
  `api_v1_module_ins`, `api_v1_module_outs`, `api_v1_module_tags`,
  `api_v1_module_panels` (policies e.g. `api_view_owner_select_publishable_*`).
- Key slot: exactly one `api_keys` row per profile (`UNIQUE (profile_id)`);
  `create_api_key(label)` + `create_partner_api_key(profile_id, label)` are atomic
  UPSERTs preserving `id`, `api_key_usage_monthly`, and (self-service) tier/quota;
  `revoke_api_key` flips `revoked_at`; re-activation reuses the slot; `rotated_at`
  tracked; Worker ≤60 s isolate metadata cache is the rotation acceptance window.
- Server-side helpers: `private.mint_api_key` / `public.verify_api_key` /
  `public.record_api_key_usage` (schemas per `20260724133200_api_identity.sql:337-342`) (no caller grants on mint; `verify`/`record` →
  `api_reader` ONLY per `api_identity.sql:344-355`; `api_tiers`/`api_keys`/
  `api_key_usage_monthly` revoked from anon/authenticated/api_reader except narrow
  authenticated SELECTs per `:65-69` — RLS `auth.uid()` is the real gate).
- Vault: `api_key_pepper` (base64, decodes to 32 bytes; exactly one row) read via
  `vault.decrypted_secrets` by `private.mint_api_key` (raises if missing/duplicated/
  malformed). Worker env `API_KEY_PEPPER` must equal it (fail-closed 503 otherwise).

## Non-negotiable rules for the move

1. Carry `api_key_pepper` VERBATIM (owner-run, server-side only, never repo).
   Rotation silently invalidates EVERY external key (`mint` HMACs with it).
2. NO consumer key reissue on cutover when rule 1 holds. Compromise flow stays:
   revoke → wait ≥60 s → create (WAF prefix/IP mitigation per standing approval).
3. Prod replays hosted GRANTs/default-privs verbatim (`\z`, grant section,
   `pg_policies`, `api_identity.sql:65-69,344-355`) with an `EXECUTE … →
   api_reader`-only audit. Staging blanket-ALL must never reach prod.
4. Parity gate: function signature + `prosecdef` hash (`public`,`private`),
   policy compare, and a create/revoke round-trip + token-gated public-link RPC
   reads (valid + invalid token) on staging before any prod move.
5. Docs classification per `DOCUMENTATION_LIFECYCLE.md` before cutover (the move
   is `public-behavioral` for API consumers; screenshots N/A; changelog only at
   publication — prep creates no public-docs edits).

## Owner-handoff checklist (each owner-present)

- [ ] Vault `api_key_pepper` recreated verbatim server-side (second secret alongside
  `price_hub_snapshot_token`); Worker `API_KEY_PEPPER` set to the same value.
- [ ] `api_reader` / `api_view_owner` roles + narrow grants replayed verbatim;
  LOGIN credential + Hyperdrive/direct-endpoint binding per `public-api/RUNBOOK.md`
  in the owner window (never in repo).
- [ ] Staging proofs green: least-privilege rehearsal, create/revoke round-trip,
  snapshot-RPC output compare, `verify:staging-parity:deep` HARD gates.
- [ ] Consumer migration notice prepared (no reissue) + docs classification recorded.

## Decision log

- 2026-10-03: drafted from repo migrations only (no DB touch) as the Phase 2 exit
  artifact the twice-BLOCKED reviews require; pepper-verbatim + no-reissue +
  least-privilege rules restated from standing approvals and `api_identity.sql`.
