import { ResponseInit } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Marks the current SSR response as an HTTP redirect via Angular's standard
 * `RESPONSE_INIT` DI token (see `guide/ssr#accessing-request-and-response-via-di`).
 *
 * Why this exists: components like `LegacyPatchRedirectComponent` /
 * `LegacyRackRedirectComponent` used to redirect legacy numeric-id URLs to their
 * canonical token URL purely via `Router.navigateByUrl()`. That works fine for real
 * browsers (client-side SPA navigation), but during SSR it only changes the
 * in-memory Router/component state for that one render — the HTTP response sent to
 * the crawler/`curl` still carries the *original* URL with a 200 status and no
 * `Location` header, so search engines and AI crawlers never learn the content has a
 * canonical new address, and (in this app's `CommonEngine`/`renderModule()` SSR
 * pipeline specifically) nothing guarantees the destination route's own data even
 * finishes loading inside the same render pass. Setting a real redirect status +
 * `Location` header instead makes the server issue a genuine HTTP 30x that any
 * crawler follows the same way it would for a hand-written `res.redirect()`.
 *
 * `server.ts` provides one `ResponseInit` object per request via `CommonEngine`'s
 * `providers` option (the same technique already used for `APP_BASE_HREF`) and reads
 * it back after `render()` resolves to decide between sending the rendered HTML and
 * issuing a real redirect.
 */
export function setSsrRedirect(responseInit: ResponseInit, statusCode: number, url: string): void {
  responseInit.status = statusCode;
  responseInit.headers = new Headers({Location: url});
}

/**
 * Performs a redirect in a way that's correct on both the browser and the server:
 * a normal client-side `Router.navigateByUrl()` in the browser (unchanged SPA
 * behavior, no full page reload), or a real HTTP redirect signal via
 * `setSsrRedirect` during SSR (see its doc comment for why the plain
 * `Router.navigateByUrl()` call alone isn't enough there).
 *
 * `responseInit` is `null` whenever `RESPONSE_INIT` isn't provided (i.e. in a normal
 * browser bootstrap, where this token is never registered) — in that case, and on
 * the server if `responseInit` is somehow unavailable, this deliberately does
 * nothing further after the `isBrowser` check, leaving the destination component in
 * its "Redirecting…" placeholder state rather than silently reintroducing the old
 * client-side-only navigation on the server.
 */
export function redirectSsrAware(options: {
  isBrowser: boolean;
  router: Router;
  responseInit: ResponseInit | null;
  url: string;
  statusCode: number;
}): void {
  const {isBrowser, router, responseInit, url, statusCode} = options;
  if (isBrowser) {
    router.navigateByUrl(url, {replaceUrl: true});
    return;
  }
  if (responseInit) {
    setSsrRedirect(responseInit, statusCode, url);
  }
}
