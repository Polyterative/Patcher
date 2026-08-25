import { execFileSync } from 'node:child_process';

/**
 * Shared logic for `e2e/global-teardown.ts`'s port-cleanup safety net.
 *
 * `killAnyProcessListeningOnPort` used to `SIGKILL` every pid `lsof` returned
 * for the dev-server port unconditionally. `lsof -i :PORT` matches any
 * process holding a socket referencing that port — listener *or* client side
 * — not only the intended orphaned `ng serve`/esbuild target, so this could
 * (and did) include the currently-running Playwright driver process itself,
 * self-killing the test runner right after its own assertions had already
 * passed. This module adds an identity-based exclusion — never signal the
 * current process or any of its ancestors — so only genuine
 * descendant/orphaned server processes are ever killed. Excluding by
 * ancestry alone can never accidentally protect the real cleanup target: the
 * `ng serve`/esbuild process spawned by Playwright's `webServer` feature is
 * topologically a *descendant* of the Playwright driver, never an ancestor.
 *
 * Known accepted limitations (inherent to any pid-based approach, not
 * introduced or worsened by this fix): the ancestor walk is capped at
 * `maxDepth` levels (generous for any realistic shell/pnpm/node/Playwright
 * process chain, but not unbounded); a pid can theoretically be recycled
 * between `findPids`/`getParentPid`'s lookup and the later `kill` call; and
 * any `ps`/`lsof` failure is treated the same as "nothing found" (matching
 * the pre-existing `lsof` wrapper's own convention below), not distinguished
 * from a permissions/missing-binary error.
 *
 * Everything here is dependency-injectable and pure/side-effect-free by
 * default parameters only, so `scripts/tests/e2e-port-cleanup.test.mjs` can
 * exercise every branch without spawning or killing any real process.
 */

/** Walks from `startPid` up through real parent pids, returning the full protected set (start pid + every ancestor up to root). */
export function collectProtectedPids(
  startPid: number,
  getParentPid: (pid: number) => number | null,
  maxDepth = 32
): Set<number> {
  const protectedPids = new Set<number>([startPid]);
  let currentPid = startPid;

  for (let i = 0; i < maxDepth; i++) {
    const parentPid = getParentPid(currentPid);
    if (parentPid === null || parentPid <= 1 || protectedPids.has(parentPid)) {
      break;
    }
    protectedPids.add(parentPid);
    currentPid = parentPid;
  }

  return protectedPids;
}

/**
 * Filters `candidatePids` down to the pids that are safe to kill: excludes
 * everything in `protectedPids`, drops malformed values (non-integer, zero,
 * or negative — `lsof`/test input should never produce these, but this stays
 * safe even if it does), and de-duplicates repeated candidates.
 */
export function selectPidsToKill(
  candidatePids: readonly number[],
  protectedPids: ReadonlySet<number>
): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const pid of candidatePids) {
    if (!Number.isInteger(pid) || pid <= 0) {
      continue;
    }
    if (protectedPids.has(pid) || seen.has(pid)) {
      continue;
    }
    seen.add(pid);
    result.push(pid);
  }

  return result;
}

/** Real parent-pid lookup via `ps`. Returns `null` when the pid has no readable parent (already exited, permission denied, etc.) — the same try/catch-returns-null style as `findPidsListeningOnPort` below. */
export function getParentPidViaPs(pid: number): number | null {
  try {
    const output = execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)], {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();

    const parentPid = Number(output);
    return Number.isInteger(parentPid) && parentPid > 0 ? parentPid : null;
  } catch {
    return null;
  }
}

/** Real "what's listening on this port" lookup via `lsof`. Returns `[]` when nothing is listening — the common, clean-teardown case, not an error. */
export function findPidsListeningOnPort(port: number): number[] {
  try {
    const output = execFileSync('lsof', ['-ti', `:${ port }`], {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();

    return output
      .split('\n')
      .map(line => Number(line.trim()))
      .filter(pid => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

export interface PortCleanupDeps {
  findPids: (port: number) => number[];
  getParentPid: (pid: number) => number | null;
  kill: (pid: number) => void;
}

const defaultDeps: PortCleanupDeps = {
  findPids: findPidsListeningOnPort,
  getParentPid: getParentPidViaPs,
  kill: pid => process.kill(pid, 'SIGKILL')
};

/**
 * Force-kills whatever is still listening on `port`, excluding the current
 * process and all of its ancestors by identity. `deps` defaults to the real
 * `lsof`/`ps`/`process.kill` implementations above, so calling this with
 * just `port` (as `global-teardown.ts` does) is real production behavior;
 * tests inject fakes to exercise every branch deterministically.
 */
export function killAnyProcessListeningOnPort(port: number, deps: PortCleanupDeps = defaultDeps): void {
  const candidatePids = deps.findPids(port);
  if (candidatePids.length === 0) {
    return;
  }

  const protectedPids = collectProtectedPids(process.pid, deps.getParentPid);
  const pids = selectPidsToKill(candidatePids, protectedPids);
  if (pids.length === 0) {
    return;
  }

  for (const pid of pids) {
    try {
      deps.kill(pid);
    } catch {
      // Already exited between the lookup above and this call — fine.
    }
  }

  console.log(`[e2e-teardown] Force-killed lingering dev server process(es) on port ${ port }: ${ pids.join(', ') }`);
}
