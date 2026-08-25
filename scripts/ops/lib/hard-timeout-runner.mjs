/**
 * Runs a child process with a hard wall-clock timeout, force-killing its
 * entire process group if it hasn't exited by then.
 *
 * This is a defense-in-depth safety net for `pnpm test:e2e*` commands: even
 * if the root cause of a hang (e.g. Angular CLI's esbuild dev server
 * spawning child/worker processes that survive Playwright's webServer
 * teardown) isn't fully addressed elsewhere, these commands can never hang a
 * shell forever again.
 */
import { spawn } from 'node:child_process';

export const DEFAULT_HARD_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const TIMED_OUT_EXIT_CODE = 124; // conventional GNU `timeout` exit code

/**
 * Spawns `command` with `args` and resolves once it exits, or once
 * `timeoutMs` elapses — whichever comes first. On timeout, the child (and,
 * on POSIX, its whole process group/tree) is force-killed with SIGKILL.
 *
 * Never rejects: spawn failures resolve with exit code `1` instead.
 *
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{cwd?: string, timeoutMs?: number, label?: string}} [options]
 * @returns {Promise<number>} the exit code the caller should use
 */
export function runWithHardTimeout(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    timeoutMs = resolveDefaultTimeoutMs(),
    label = command
  } = options;

  return new Promise(resolve => {
    const isPosix = process.platform !== 'win32';
    let timedOut = false;
    let settled = false;

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      // Detaching gives the child its own process group (POSIX) so a
      // force-kill can take out any grandchildren it spawned (e.g. `ng
      // serve`'s esbuild workers), not just the direct child.
      detached: isPosix
    });

    const timer = setTimeout(() => {
      timedOut = true;
      console.error(
        `\n[hard-timeout] "${ label }" did not finish within ${ Math.round(timeoutMs / 60_000) } minute(s); force-killing it.`
      );
      killProcessTree(child, isPosix);
    }, timeoutMs);
    timer.unref();

    const finish = code => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(code);
    };

    child.on('error', error => {
      console.error(`[hard-timeout] Failed to start "${ label }": ${ error.message }`);
      finish(1);
    });

    child.on('exit', (code, signal) => {
      if (timedOut) {
        console.error(`[hard-timeout] "${ label }" was force-killed after hanging.`);
        finish(TIMED_OUT_EXIT_CODE);
        return;
      }
      finish(code ?? (signal ? 1 : 0));
    });
  });
}

function killProcessTree(child, isPosix) {
  if (typeof child.pid !== 'number') {
    return;
  }
  try {
    if (isPosix) {
      // Negative pid == "the whole process group", not just this one pid.
      process.kill(-child.pid, 'SIGKILL');
    } else {
      child.kill('SIGKILL');
    }
  } catch {
    // Already exited between the timeout firing and this call — fine.
  }
}

function resolveDefaultTimeoutMs() {
  const raw = process.env['E2E_HARD_TIMEOUT_MS'];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HARD_TIMEOUT_MS;
}
