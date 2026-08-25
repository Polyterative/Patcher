/**
 * Shared logic for detecting whether a Playwright `BASE_URL` points at the
 * local Angular dev server that `playwright.config.ts` auto-starts via its
 * `webServer` option.
 *
 * Used by:
 * - `playwright.config.ts` to decide whether to start `pnpm start` at all.
 * - `global-teardown.ts` to decide whether it's safe to force-kill whatever
 *   is still bound to that port once a run finishes (never touch a
 *   remote/staging `BASE_URL`).
 */

export const LOCAL_DEV_SERVER_PORT = 5556;

const LOCAL_DEV_SERVER_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * True when `baseURL` resolves to the local dev server host + port that
 * `playwright.config.ts` manages, as opposed to a remote/staging host passed
 * in via the `BASE_URL` env var.
 */
export function usesLocalDevServer(baseURL: string): boolean {
  try {
    const parsed = new URL(baseURL);
    return LOCAL_DEV_SERVER_HOSTS.has(parsed.hostname) && parsed.port === String(LOCAL_DEV_SERVER_PORT);
  } catch {
    return false;
  }
}
