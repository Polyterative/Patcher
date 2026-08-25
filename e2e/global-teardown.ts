import { execFileSync } from 'node:child_process';
import {
  LOCAL_DEV_SERVER_PORT,
  usesLocalDevServer
} from './helpers/local-dev-server';

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
 * we never touch a remote/staging `BASE_URL`.
 */
export default async function globalTeardown(): Promise<void> {
  const baseURL = process.env['BASE_URL'] ?? DEFAULT_BASE_URL;

  if (!usesLocalDevServer(baseURL)) {
    return;
  }

  killAnyProcessListeningOnPort(LOCAL_DEV_SERVER_PORT);
}

function killAnyProcessListeningOnPort(port: number): void {
  const pids = findPidsListeningOnPort(port);

  if (pids.length === 0) {
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already exited between the lookup above and this call — fine.
    }
  }

  console.log(`[e2e-teardown] Force-killed lingering dev server process(es) on port ${ port }: ${ pids.join(', ') }`);
}

function findPidsListeningOnPort(port: number): number[] {
  try {
    const output = execFileSync('lsof', ['-ti', `:${ port }`], {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();

    return output
      .split('\n')
      .map(line => Number(line.trim()))
      .filter(pid => Number.isInteger(pid) && pid > 0);
  } catch {
    // `lsof` exits non-zero when nothing is listening on the port — that's
    // the common case (clean teardown), not an error.
    return [];
  }
}
