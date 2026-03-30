export interface SsrHostEnvironment {
  NG_ALLOWED_HOSTS?: string;
  SEO_CANONICAL_ORIGIN?: string;
  VERCEL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}

export interface RequestOriginInput {
  protocol?: string;
  host?: string;
  forwardedHost?: string | string[];
  forwardedProto?: string | string[];
}

const LOCAL_DEV_HOSTS = ['localhost', '127.0.0.1'];
const VERCEL_HOST_WILDCARD = '*.vercel.app';

export function resolveSsrAllowedHosts(env: SsrHostEnvironment = process.env): string[] {
  const allowedHosts = new Set<string>(LOCAL_DEV_HOSTS);
  
  addAllowedHosts(allowedHosts, env.NG_ALLOWED_HOSTS);
  addAllowedHost(allowedHosts, env.SEO_CANONICAL_ORIGIN);
  addAllowedHost(allowedHosts, env.VERCEL_PROJECT_PRODUCTION_URL);
  addAllowedHost(allowedHosts, env.VERCEL_BRANCH_URL);
  addAllowedHost(allowedHosts, env.VERCEL_URL);
  
  if (shouldAllowVercelHosts(env)) {
    allowedHosts.add(VERCEL_HOST_WILDCARD);
  }
  
  return [...allowedHosts];
}

export function resolveRequestOrigin(input: RequestOriginInput): string {
  const protocol = normalizeProtocol(
    getFirstHeaderValue(input.forwardedProto) || input.protocol || 'http',
  );
  const host = normalizeHostHeader(
    getFirstHeaderValue(input.forwardedHost) || input.host || LOCAL_DEV_HOSTS[0],
  );
  
  return `${ protocol }://${ host }`;
}

export function normalizeHostCandidate(value?: string): string | undefined {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return undefined;
  }
  
  if (trimmedValue.startsWith('*.')) {
    const normalizedWildcard = normalizeHostname(trimmedValue.slice(2));
    return normalizedWildcard ? `*.${ normalizedWildcard }` : undefined;
  }
  
  try {
    const prefixedValue = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmedValue)
      ? trimmedValue
      : `https://${ trimmedValue }`;
    return new URL(prefixedValue).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function addAllowedHosts(allowedHosts: Set<string>, values?: string): void {
  for (const value of values?.split(',') || []) {
    addAllowedHost(allowedHosts, value);
  }
}

function addAllowedHost(allowedHosts: Set<string>, value?: string): void {
  const normalizedHost = normalizeHostCandidate(value);
  if (normalizedHost) {
    allowedHosts.add(normalizedHost);
  }
}

function shouldAllowVercelHosts(env: SsrHostEnvironment): boolean {
  return Boolean(
    env.VERCEL === '1'
    || env.VERCEL_URL
    || env.VERCEL_BRANCH_URL
    || env.NG_ALLOWED_HOSTS?.includes('.vercel.app'),
  );
}

function getFirstHeaderValue(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return getFirstHeaderValue(value[0]);
  }
  
  return value?.split(',')[0]?.trim();
}

function normalizeProtocol(value: string): string {
  return value.trim().toLowerCase() === 'https' ? 'https' : 'http';
}

function normalizeHostHeader(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return LOCAL_DEV_HOSTS[0];
  }
  
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmedValue)) {
    try {
      return new URL(trimmedValue).host.toLowerCase();
    } catch {
      return LOCAL_DEV_HOSTS[0];
    }
  }
  
  return trimmedValue.toLowerCase();
}

function normalizeHostname(value: string): string | undefined {
  const trimmedValue = value.trim().toLowerCase().replace(/^https?:\/\//, '');
  if (!trimmedValue) {
    return undefined;
  }
  
  return trimmedValue.split('/')[0]?.split(':')[0] || undefined;
}