---
name: vercel-env
description: Use when a Vercel environment variable for Patcher must be read, added or changed (e.g. pointing a preview branch at another Supabase backend), followed by a redeploy and a check of which backend the deployment actually calls. Covers CLI login, project link, branch-scoped Preview vars, redeploy and browser verification.
---

# Patcher — Vercel env vars + redeploy

The frontend build reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` at build time (`generate-env.js`; shell env wins over `.env`).
Changing them on Vercel only takes effect after a **redeploy**.

## 1. Login (owner, once per machine)

Agents never sign in for the owner. Check first:

```bash
npx -y vercel whoami
```

If not logged in, ask the owner to run `npx vercel login` in their terminal and approve the device link it prints
(the link expires; re-run for a fresh one). Watch the terminal with `read_terminal` until it reports success.

## 2. Link the repo (once per checkout)

```bash
npx -y vercel link --yes --project patcher --scope polys-projects-01f337a7
```

Side effects to undo: it writes `.env.local` (a short-lived `VERCEL_OIDC_TOKEN`, not needed — delete it, since
`generate-env.js` also loads `.env.local`) and appends `.vercel` / `.env*` to `.gitignore` (revert; `.vercel` is already ignored).

## 3. Read / change variables

```bash
npx -y vercel env ls                       # all environments
npx -y vercel env ls preview develop       # one preview branch
```

Add a value scoped to **Preview + one branch** (overrides the general Preview value for that branch only). Pipe the value
on stdin so it never lands on argv or in history; take secrets from local gitignored env files, never echo them:

```bash
printf '%s' "https://example" | npx -y vercel env add SUPABASE_URL preview develop
k=$(grep -E '^SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d "\"' "); printf '%s' "$k" | npx -y vercel env add SUPABASE_ANON_KEY preview develop; unset k
```

Remove: `npx -y vercel env rm NAME preview develop --yes`.
**Never touch Production values unless the owner explicitly asks for that exact change** (it is the live site).
Before adding a backend URL + key, prove the pair works (`curl .../rest/v1/<table>?select=id&limit=1 -H "apikey: $k"` → 200).

## 4. Redeploy

```bash
npx -y vercel redeploy https://patcher-git-develop-polys-projects-01f337a7.vercel.app --target preview
```

The branch alias `patcher-git-<branch>-polys-projects-01f337a7.vercel.app` always points at the branch's latest deployment.
A build takes ~3 min.

## 5. Verify what the deployment really calls

Do not infer from config — load the page in the browser pane and list request hosts:

```js
[...new Set(performance.getEntriesByType('resource').map(e => new URL(e.name).host))]
```

Expect the intended Supabase host and no other. Then spot-check pages with data: `/`, `/modules/browser`, `/patches/browser`,
`/racks/browser`, `/auth/login`. (`ERR_BLOCKED_BY_CLIENT` console errors are blocked analytics, not failures.)
