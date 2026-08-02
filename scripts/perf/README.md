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

The harness writes JSON summaries, Playwright traces, and screenshots to the ignored `tmp/perf/<flow>/`
directory. It records separate cold and warm medians; compare only runs made with the same Chromium
binary, viewport, settle time, and server configuration.
