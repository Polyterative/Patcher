import {
  LOCAL_DEV_SERVER_PORT,
  usesLocalDevServer
} from './helpers/local-dev-server';
import { killAnyProcessListeningOnPort } from './helpers/port-cleanup';

const DEFAULT_BASE_URL = `http://localhost:${ LOCAL_DEV_SERVER_PORT }`;

/**
 * Playwright's `webServer` teardown sends SIGTERM to the `pnpm start`
 * (`ng serve`) process it spawned, but Angular CLI's esbuild-based dev server
 * forks additional child/worker processes that don't always die with their
 * parent. That leaves the port 5556 listener alive, which hangs the outer
 * `pnpm test:e2e*` shell command forever even though every test has finished.
 *
 * As a last resort, force-kill anything still bound to that port — but only
 * when we know Playwright started a local dev server in the first place, so
 * we never touch a remote/staging `BASE_URL`. `killAnyProcessListeningOnPort`
 * (see `./helpers/port-cleanup.ts`) additionally excludes the current
 * process and all of its ancestors by identity, so it can never `SIGKILL`
 * the Playwright driver process running this very teardown — only genuine
 * orphaned descendant server processes (`ng serve`/esbuild) are ever killed.
 */
export default async function globalTeardown(): Promise<void> {
  const baseURL = process.env['BASE_URL'] ?? DEFAULT_BASE_URL;

  if (!usesLocalDevServer(baseURL)) {
    return;
  }

  killAnyProcessListeningOnPort(LOCAL_DEV_SERVER_PORT);
}
