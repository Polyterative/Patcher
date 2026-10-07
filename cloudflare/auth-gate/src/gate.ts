// Turnstile gate for the self-hosted Supabase auth endpoints that send email
// (signup, recover, otp, resend). Password login and token refresh are not routed here,
// so e2e/API logins keep working. The browser passes the Turnstile token the way
// supabase-js does natively: body.gotrue_meta_security.captcha_token.

export type GateMode = 'off' | 'log' | 'enforce';

export interface GateEnv {
  TURNSTILE_SECRET: string;
  MODE?: string;
}

export interface VerifyOutcome {
  ok: boolean;
  reason: string;
}

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const GATED_PATH = /^\/auth\/v1\/(signup|recover|otp|resend)\/?$/;

export function readMode(value: string | undefined): GateMode {
  return value === 'off' || value === 'enforce' ? value : 'log';
}

export function isGatedRequest(request: Request): boolean {
  return request.method === 'POST' && GATED_PATH.test(new URL(request.url).pathname);
}

export function extractCaptchaToken(body: string): string | null {
  try {
    const token = JSON.parse(body)?.gotrue_meta_security?.captcha_token;
    return typeof token === 'string' && token ? token : null;
  } catch {
    return null;
  }
}

export async function verifyToken(
  token: string | null,
  secret: string,
  remoteIp: string | null,
  fetcher: typeof fetch = fetch,
): Promise<VerifyOutcome> {
  if (!token) return { ok: false, reason: 'missing token' };
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (remoteIp) form.append('remoteip', remoteIp);
  try {
    const response = await fetcher(SITEVERIFY_URL, { method: 'POST', body: form });
    if (!response.ok) return { ok: true, reason: `siteverify HTTP ${response.status}, failing open` };
    const result = await response.json() as { success?: boolean; 'error-codes'?: string[] };
    return result.success
      ? { ok: true, reason: 'verified' }
      : { ok: false, reason: (result['error-codes'] ?? ['rejected']).join(',') };
  } catch (error) {
    // Cloudflare's own verifier being unreachable must not block signups.
    return { ok: true, reason: `siteverify unreachable, failing open: ${error instanceof Error ? error.message : error}` };
  }
}

// Same shape GoTrue returns for a failed captcha, so supabase-js surfaces it as an AuthApiError.
export function captchaFailedResponse(request: Request): Response {
  return new Response(
    JSON.stringify({ code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed' }),
    {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': request.headers.get('origin') || '*',
        vary: 'Origin',
      },
    },
  );
}

export async function handle(request: Request, env: GateEnv, fetcher: typeof fetch = fetch): Promise<Response> {
  const mode = readMode(env.MODE);
  if (mode === 'off' || !isGatedRequest(request)) return fetcher(request);

  const body = await request.text();
  const outcome = await verifyToken(extractCaptchaToken(body), env.TURNSTILE_SECRET, request.headers.get('cf-connecting-ip'), fetcher);
  const path = new URL(request.url).pathname;
  console.log(`${mode} ${path}: ${outcome.ok ? 'pass' : 'FAIL'} (${outcome.reason})`);

  if (!outcome.ok && mode === 'enforce') return captchaFailedResponse(request);
  return fetcher(new Request(request, { body }));
}
