# Chrome flow measurement

Build and serve the production app before collecting a profile:

```bash
pnpm build
NG_ALLOWED_HOSTS='127.0.0.1,localhost,patcher.xyz' SEO_CANONICAL_ORIGIN='https://patcher.xyz' VERCEL=1 \
  node --input-type=module -e "import { createServer } from 'node:http'; import { app } from './dist/Patcher/server/server.mjs'; createServer(app()).listen(5557, '127.0.0.1')"
```

Run a flow against that server:

```bash
pnpm perf:measure -- --flow home --url http://127.0.0.1:5557/ --runs 5
```

For authenticated flows, seed `playwright/.auth/user.json` once via
`pnpm test:e2e:auth` and pass it explicitly:

```bash
pnpm perf:measure -- --flow user-area --url http://localhost:5556/user/area --runs 5 --storage-state playwright/.auth/user.json
```

The harness writes JSON summaries, Playwright traces, and screenshots to the ignored `tmp/perf/<flow>/`
directory. Its settle time is measured from navigation start, so delayed work cannot spill into the
critical window. It records separate cold and warm medians; compare only runs made with the same Chromium
binary, viewport, settle time, and server configuration.
