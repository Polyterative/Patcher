// Outside-in uptime watchdog. Runs on Cloudflare's network every 5 minutes, so it still
// alerts when the NAS, its internet link or the NAS cron (scripts/ops/selfhost-health-notify.sh)
// is down. Pushes to the same ntfy topic as the NAS checks.

export interface WatchdogEnv {
  STATE: KVNamespace;
  NTFY_TOPIC: string;
  SUPABASE_ANON_KEY: string;
  NTFY_SERVER?: string;
  SELFHOST_URL?: string;
  HOSTED_URL?: string;
  SAMPLE_PANEL?: string;
  REMIND_HOURS?: string;
  HEARTBEAT_UTC_HOUR?: string;
  FAILS_BEFORE_ALERT?: string;
}

export interface Probe {
  name: string;
  url: string;
  headers?: Record<string, string>;
  expectStatus: number[];
  expectContentType?: string;
  expectBody?: (body: string) => boolean;
}

export interface ProbeResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ProbeState {
  fails: number;
  alerted: boolean;
  since: number;
  lastNotified: number;
}

export type WatchdogState = Record<string, ProbeState>;

export interface Notification {
  title: string;
  body: string;
  priority: 'min' | 'default' | 'high';
  tags: string;
}

export const DEFAULT_SELFHOST_URL = 'https://supabase.patcher.xyz';
export const DEFAULT_HOSTED_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
export const DEFAULT_SAMPLE_PANEL = 'afterneath-earthquaker_devices-light-3u.jpg';
const STATE_KEY = 'state';
const PROBE_TIMEOUT_MS = 10_000;

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function buildProbes(env: WatchdogEnv): Probe[] {
  const selfhost = (env.SELFHOST_URL || DEFAULT_SELFHOST_URL).replace(/\/+$/, '');
  const panel = env.SAMPLE_PANEL || DEFAULT_SAMPLE_PANEL;
  const apikey = { apikey: env.SUPABASE_ANON_KEY };
  const probes: Probe[] = [
    {
      name: 'site',
      url: 'https://patcher.xyz/',
      expectStatus: [200],
      expectBody: body => body.includes('<app-root'),
    },
    { name: 'selfhost auth', url: `${selfhost}/auth/v1/health`, headers: apikey, expectStatus: [200] },
    {
      name: 'selfhost rest',
      url: `${selfhost}/rest/v1/standards?select=id&limit=1`,
      headers: apikey,
      expectStatus: [200],
      expectBody: body => body.startsWith('[{'),
    },
    {
      name: 'selfhost storage',
      url: `${selfhost}/storage/v1/object/public/module-panels/${panel}`,
      headers: { Range: 'bytes=0-0' },
      expectStatus: [200, 206],
      expectContentType: 'image/',
    },
    {
      name: 'image proxy',
      url: `https://images.patcher.xyz/module-panels/${panel}`,
      expectStatus: [200],
      expectContentType: 'image/',
    },
    // No key: a 401 proves the Worker and its auth path answer.
    { name: 'public api', url: 'https://api.patcher.xyz/v1/standards', expectStatus: [401] },
  ];
  // Hosted Supabase still serves production until the cutover; set HOSTED_URL to "" to drop it.
  const hosted = env.HOSTED_URL ?? DEFAULT_HOSTED_URL;
  if (hosted) {
    probes.push({ name: 'hosted auth', url: `${hosted.replace(/\/+$/, '')}/auth/v1/health`, headers: apikey, expectStatus: [200] });
  }
  return probes;
}

export async function runProbe(probe: Probe, fetcher: typeof fetch = fetch): Promise<ProbeResult> {
  try {
    const response = await fetcher(probe.url, {
      headers: { 'User-Agent': 'patcher-uptime-watchdog', ...probe.headers },
      redirect: 'manual',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!probe.expectStatus.includes(response.status)) {
      return { name: probe.name, ok: false, detail: `HTTP ${response.status}` };
    }
    const contentType = response.headers.get('content-type') || '';
    if (probe.expectContentType && !contentType.startsWith(probe.expectContentType)) {
      return { name: probe.name, ok: false, detail: `content-type ${contentType || 'missing'}` };
    }
    if (probe.expectBody) {
      const body = await response.text();
      if (!probe.expectBody(body)) return { name: probe.name, ok: false, detail: 'unexpected body' };
    } else {
      await response.body?.cancel();
    }
    return { name: probe.name, ok: true, detail: `HTTP ${response.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.name === 'TimeoutError' ? 'timeout' : error.message : String(error);
    return { name: probe.name, ok: false, detail: message };
  }
}

function minutesAgo(now: number, since: number): string {
  const minutes = Math.round((now - since) / 60_000);
  return minutes < 120 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
}

// Pure state machine: a probe alerts after N consecutive failures, reminds every REMIND_HOURS,
// and sends a recovery notice only if it had alerted. Single-run blips stay silent.
export function evaluate(
  previous: WatchdogState,
  results: ProbeResult[],
  now: number,
  options: { failsBeforeAlert: number; remindMs: number },
): { state: WatchdogState; notifications: Notification[] } {
  const state: WatchdogState = {};
  const newlyDown: string[] = [];
  const stillDown: string[] = [];
  const recovered: string[] = [];

  for (const result of results) {
    const prior = previous[result.name] ?? { fails: 0, alerted: false, since: now, lastNotified: 0 };
    if (result.ok) {
      if (prior.alerted) recovered.push(`${result.name} (down ${minutesAgo(now, prior.since)})`);
      state[result.name] = { fails: 0, alerted: false, since: now, lastNotified: 0 };
      continue;
    }
    const next: ProbeState = {
      fails: prior.fails + 1,
      alerted: prior.alerted,
      since: prior.fails === 0 ? now : prior.since,
      lastNotified: prior.lastNotified,
    };
    if (!next.alerted && next.fails >= options.failsBeforeAlert) {
      next.alerted = true;
      next.lastNotified = now;
      newlyDown.push(`${result.name}: ${result.detail}`);
    } else if (next.alerted && now - next.lastNotified >= options.remindMs) {
      next.lastNotified = now;
      stillDown.push(`${result.name}: ${result.detail} (down ${minutesAgo(now, next.since)})`);
    }
    state[result.name] = next;
  }

  const notifications: Notification[] = [];
  if (newlyDown.length) {
    notifications.push({ title: 'Patcher DOWN (Cloudflare watchdog)', body: newlyDown.join('\n'), priority: 'high', tags: 'rotating_light' });
  }
  if (stillDown.length) {
    notifications.push({ title: 'Patcher still down (Cloudflare watchdog)', body: stillDown.join('\n'), priority: 'high', tags: 'warning' });
  }
  if (recovered.length) {
    notifications.push({ title: 'Patcher recovered (Cloudflare watchdog)', body: recovered.join('\n'), priority: 'default', tags: 'white_check_mark' });
  }
  return { state, notifications };
}

export function isHeartbeatRun(scheduledTime: number, utcHour: number): boolean {
  const date = new Date(scheduledTime);
  return date.getUTCHours() === utcHour && date.getUTCMinutes() < 5;
}

export function heartbeat(results: ProbeResult[]): Notification {
  const down = results.filter(result => !result.ok);
  return {
    title: 'Patcher watchdog heartbeat (Cloudflare)',
    body: down.length
      ? `${results.length - down.length}/${results.length} OK. Failing: ${down.map(result => result.name).join(', ')}`
      : `All ${results.length} checks OK.`,
    priority: 'min',
    tags: 'cloud',
  };
}

async function notify(env: WatchdogEnv, notification: Notification): Promise<void> {
  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const response = await fetch(`${server}/${env.NTFY_TOPIC}`, {
    method: 'POST',
    body: notification.body,
    headers: { Title: notification.title, Priority: notification.priority, Tags: notification.tags },
  });
  if (!response.ok) console.error(`ntfy push failed: HTTP ${response.status}`);
}

export async function runWatchdog(env: WatchdogEnv, scheduledTime: number): Promise<ProbeResult[]> {
  const results = await Promise.all(buildProbes(env).map(probe => runProbe(probe)));
  const previous = (await env.STATE.get<WatchdogState>(STATE_KEY, 'json')) ?? {};
  const { state, notifications } = evaluate(previous, results, scheduledTime, {
    failsBeforeAlert: Math.max(1, readInt(env.FAILS_BEFORE_ALERT, 2)),
    remindMs: readInt(env.REMIND_HOURS, 4) * 3_600_000,
  });
  if (isHeartbeatRun(scheduledTime, readInt(env.HEARTBEAT_UTC_HOUR, 7))) notifications.push(heartbeat(results));

  // KV free tier allows 1000 writes/day: only write when something besides timestamps of healthy probes changed.
  if (JSON.stringify(stripHealthy(state)) !== JSON.stringify(stripHealthy(previous))) {
    await env.STATE.put(STATE_KEY, JSON.stringify(state));
  }
  await Promise.all(notifications.map(notification => notify(env, notification)));
  console.log(results.map(result => `${result.ok ? 'OK  ' : 'FAIL'} ${result.name}: ${result.detail}`).join('\n'));
  return results;
}

function stripHealthy(state: WatchdogState): WatchdogState {
  return Object.fromEntries(Object.entries(state).filter(([, probe]) => probe.fails > 0));
}
