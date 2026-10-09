// Unattended full Price Hub refresh (crawl + match + import) for the self-host NAS cron job.
// Wraps refresh-local's per-store pipeline with:
//   - a resume checkpoint, so a restarted container skips stores already finished;
//   - a per-store timeout + retry for thrown errors, and an overall run deadline;
//   - ntfy pushes (start, progress, failures, final summary) and a last-run.json for the dead-man check.
// Same flags as refresh-local (--dry-run, --store=..., ...). Settings come from env, see readScheduledSettings.
// Plan: internaldocs/workflow/plans/price-hub-scheduled-refresh.md
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createRefreshSupabaseClient,
  printStoreSummary,
  readRefreshCliOptions,
  refreshStore,
  resolveModules,
  type RefreshLocalOptions,
  type StoreRefreshSummary,
} from './refresh-local.ts';
import { assertSupabaseWriteKeyCanWrite, readPriceHubScriptEnv } from './local-env.ts';
import { readApprovedPriceHubStores } from './store-configs.ts';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export interface ScheduledSettings {
  stateDir: string;
  storeTimeoutMs: number;
  runDeadlineMs: number;
  progressIntervalMs: number;
  resumeMaxAgeMs: number;
  storeRetries: number;
  retryDelayMs: number;
  ntfyServer: string;
  ntfyTopic: string;
}

export interface RunCheckpoint {
  runId: string;
  startedAt: string;
  dryRun: boolean;
  storeSet: string;
  done: Record<string, StoreRefreshSummary>;
}

export type RunStatus = 'ok' | 'partial' | 'incomplete';

export interface RunReport {
  runId: string;
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  status: RunStatus;
  storesTotal: number;
  storesImported: number;
  storesSkipped: number;
  storesFailed: number;
  storesNotReached: number;
  importedSnapshots: number;
  upsertedListings: number;
  deactivatedListings: number;
  problemStores: string[];
}

export function readScheduledSettings(env: NodeJS.ProcessEnv): ScheduledSettings {
  const topicFile = env.NTFY_TOPIC_FILE ?? '';
  const topicFromFile = topicFile && existsSync(topicFile) ? readFileSync(topicFile, 'utf8').trim() : '';
  return {
    stateDir: env.PRICE_HUB_STATE_DIR ?? 'tmp/price-hub-scheduled',
    storeTimeoutMs: readPositiveNumber(env.PRICE_HUB_STORE_TIMEOUT_MIN, 60, 'PRICE_HUB_STORE_TIMEOUT_MIN') * MINUTE_MS,
    runDeadlineMs: readPositiveNumber(env.PRICE_HUB_RUN_DEADLINE_H, 10, 'PRICE_HUB_RUN_DEADLINE_H') * HOUR_MS,
    progressIntervalMs: readPositiveNumber(env.PRICE_HUB_PROGRESS_MIN, 30, 'PRICE_HUB_PROGRESS_MIN') * MINUTE_MS,
    resumeMaxAgeMs: readPositiveNumber(env.PRICE_HUB_RESUME_MAX_AGE_H, 24, 'PRICE_HUB_RESUME_MAX_AGE_H') * HOUR_MS,
    storeRetries: Math.floor(readNonNegativeNumber(env.PRICE_HUB_STORE_RETRIES, 1, 'PRICE_HUB_STORE_RETRIES')),
    retryDelayMs: readNonNegativeNumber(env.PRICE_HUB_RETRY_DELAY_MIN, 5, 'PRICE_HUB_RETRY_DELAY_MIN') * MINUTE_MS,
    ntfyServer: (env.NTFY_SERVER ?? 'https://ntfy.sh').replace(/\/+$/, ''),
    ntfyTopic: (env.NTFY_TOPIC ?? '').trim() || topicFromFile,
  };
}

/** Resume an unfinished checkpoint of the same kind (dry/live, store set) that is young enough; otherwise start fresh. */
export function planCheckpoint(
  existing: RunCheckpoint | null,
  now: Date,
  dryRun: boolean,
  storeSet: string,
  resumeMaxAgeMs: number,
): { checkpoint: RunCheckpoint; resumed: boolean } {
  if (existing && existing.dryRun === dryRun && existing.storeSet === storeSet) {
    const age = now.getTime() - Date.parse(existing.startedAt);
    if (Number.isFinite(age) && age >= 0 && age < resumeMaxAgeMs) {
      return { checkpoint: existing, resumed: true };
    }
  }
  return {
    checkpoint: { runId: now.toISOString().replace(/[:.]/g, '-'), startedAt: now.toISOString(), dryRun, storeSet, done: {} },
    resumed: false,
  };
}

export function buildRunReport(
  checkpoint: RunCheckpoint,
  storeSlugs: readonly string[],
  finishedAt: Date,
): RunReport {
  const summaries = storeSlugs.map((slug) => checkpoint.done[slug]).filter((summary): summary is StoreRefreshSummary => !!summary);
  const count = (status: StoreRefreshSummary['status']) => summaries.filter((summary) => summary.status === status).length;
  const storesFailed = count('failed');
  const storesSkipped = count('skipped');
  const storesNotReached = storeSlugs.length - summaries.length;
  const status: RunStatus = storesNotReached > 0 ? 'incomplete' : (storesFailed + storesSkipped > 0 ? 'partial' : 'ok');
  return {
    runId: checkpoint.runId,
    startedAt: checkpoint.startedAt,
    finishedAt: finishedAt.toISOString(),
    dryRun: checkpoint.dryRun,
    status,
    storesTotal: storeSlugs.length,
    storesImported: count('imported') + count('dry_run'),
    storesSkipped,
    storesFailed,
    storesNotReached,
    importedSnapshots: sum(summaries, 'importedSnapshots'),
    upsertedListings: sum(summaries, 'upsertedListings'),
    deactivatedListings: sum(summaries, 'deactivatedListings'),
    problemStores: summaries.filter((summary) => summary.status === 'failed' || summary.status === 'skipped').map((summary) => `${summary.storeSlug} (${summary.status})`),
  };
}

export function formatProgress(checkpoint: RunCheckpoint, storeSlugs: readonly string[], now: Date): string {
  const report = buildRunReport(checkpoint, storeSlugs, now);
  const done = storeSlugs.length - report.storesNotReached;
  const elapsedMin = Math.round((now.getTime() - Date.parse(checkpoint.startedAt)) / MINUTE_MS);
  return `${done}/${storeSlugs.length} stores done in ${formatDuration(elapsedMin)} — ${report.storesFailed} failed, ${report.storesSkipped} skipped; `
    + `${report.importedSnapshots} snapshots, ${report.upsertedListings} listings, ${report.deactivatedListings} deactivated so far.`;
}

export function formatFinal(report: RunReport): string {
  const elapsedMin = Math.round((Date.parse(report.finishedAt) - Date.parse(report.startedAt)) / MINUTE_MS);
  const lines = [
    `${report.status.toUpperCase()} in ${formatDuration(elapsedMin)}: ${report.storesImported}/${report.storesTotal} stores ${report.dryRun ? 'dry-run' : 'imported'}, `
      + `${report.storesSkipped} skipped, ${report.storesFailed} failed${report.storesNotReached ? `, ${report.storesNotReached} not reached (deadline)` : ''}.`,
    `${report.importedSnapshots} snapshots, ${report.upsertedListings} listings, ${report.deactivatedListings} deactivated.`,
  ];
  if (report.problemStores.length > 0) {
    lines.push(`Check: ${report.problemStores.join(', ')}`);
  }
  return lines.join('\n');
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function sum(summaries: readonly StoreRefreshSummary[], key: 'importedSnapshots' | 'upsertedListings' | 'deactivatedListings'): number {
  return summaries.reduce((total, summary) => total + summary[key], 0);
}

export async function withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / MINUTE_MS)} min.`)), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

class Notifier {
  private readonly server: string;
  private readonly topic: string;
  private readonly prefix: string;

  constructor(server: string, topic: string, prefix: string) {
    this.server = server;
    this.topic = topic;
    this.prefix = prefix;
  }

  async send(title: string, message: string, options: { priority?: 'low' | 'default' | 'high'; tags?: string } = {}): Promise<void> {
    console.log(`[notify] ${title}: ${message}`);
    if (!this.topic) {
      return;
    }
    try {
      const response = await fetch(`${this.server}/${this.topic}`, {
        method: 'POST',
        headers: {
          Title: `${this.prefix}${title}`,
          Priority: options.priority ?? 'default',
          ...(options.tags ? { Tags: options.tags } : {}),
        },
        body: message,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        console.warn(`[notify] ntfy answered ${response.status}`);
      }
    } catch (error) {
      console.warn(`[notify] push failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmpPath, path);
}

function failedSummary(storeSlug: string, message: string): StoreRefreshSummary {
  return {
    storeSlug,
    status: 'failed',
    products: 0,
    matchCandidates: 0,
    importRows: 0,
    importedSnapshots: 0,
    upsertedListings: 0,
    deactivatedListings: 0,
    warnings: [message],
  };
}

/** Retries only thrown errors (network, timeouts); sanity-gate `skipped` results come back as-is. */
async function refreshStoreWithRetries(
  storeSlug: string,
  run: () => Promise<StoreRefreshSummary>,
  settings: ScheduledSettings,
): Promise<StoreRefreshSummary> {
  let lastMessage = 'No result.';
  for (let attempt = 0; attempt <= settings.storeRetries; attempt++) {
    if (attempt > 0) {
      // Linear backoff; a few minutes lets 429 rate limits reset.
      const delayMs = attempt * settings.retryDelayMs;
      console.warn(`${storeSlug}: retry ${attempt}/${settings.storeRetries} in ${Math.round(delayMs / MINUTE_MS)} min.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      return await withTimeout(run(), settings.storeTimeoutMs, storeSlug);
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
      console.error(`Price Hub refresh failed for ${storeSlug} (attempt ${attempt + 1}): ${lastMessage}`);
    }
  }
  return failedSummary(storeSlug, lastMessage);
}

async function main(): Promise<number> {
  const env = readPriceHubScriptEnv();
  const settings = readScheduledSettings(env);
  const args = process.argv.slice(2);
  const options: RefreshLocalOptions = readRefreshCliOptions(
    args.some((arg) => arg.startsWith('--out=')) ? args : [...args, `--out=${join(settings.stateDir, 'out')}`],
    env,
  );
  if (!options.dryRun) {
    assertSupabaseWriteKeyCanWrite(options.supabaseKey, 'Set SUPABASE_SERVICE_ROLE_KEY in the NAS price-hub.env file.');
  }

  await mkdir(settings.stateDir, { recursive: true });
  const checkpointPath = join(settings.stateDir, 'current-run.json');
  const reportPath = join(settings.stateDir, options.dryRun ? 'last-dry-run.json' : 'last-run.json');
  const notifier = new Notifier(settings.ntfyServer, settings.ntfyTopic, options.dryRun ? 'Price Hub dry-run: ' : 'Price Hub: ');

  const stores = readApprovedPriceHubStores(options.store);
  const storeSlugs = stores.map((store) => store.slug);
  const { checkpoint, resumed } = planCheckpoint(
    await readJsonFile<RunCheckpoint>(checkpointPath),
    new Date(),
    options.dryRun,
    options.store,
    settings.resumeMaxAgeMs,
  );
  await writeJsonAtomic(checkpointPath, checkpoint);

  const deadline = Date.parse(checkpoint.startedAt) + settings.runDeadlineMs;
  const remaining = storeSlugs.filter((slug) => !checkpoint.done[slug]);
  let stopRequested = false;
  const onSignal = (signal: string) => {
    stopRequested = true;
    console.warn(`Received ${signal}; stopping after the checkpoint is saved.`);
    void notifier.send('stopped', `${signal} received. ${formatProgress(checkpoint, storeSlugs, new Date())} The next start within 24 h resumes.`, { priority: 'high', tags: 'warning' })
      .finally(() => process.exit(143));
  };
  process.once('SIGTERM', () => onSignal('SIGTERM'));
  process.once('SIGINT', () => onSignal('SIGINT'));

  await notifier.send(
    resumed ? 'resumed' : 'started',
    resumed
      ? `Resuming run ${checkpoint.runId}: ${remaining.length} of ${storeSlugs.length} stores left.`
      : `Full refresh of ${storeSlugs.length} stores started.`,
    { priority: 'low', tags: 'arrows_counterclockwise' },
  );

  try {
    const modules = await resolveModules(options);
    const supabase = createRefreshSupabaseClient(options);
    let lastProgressAt = Date.now();

    for (const store of stores) {
      if (stopRequested) {
        break;
      }
      if (checkpoint.done[store.slug]) {
        continue;
      }
      if (Date.now() > deadline) {
        console.warn(`Run deadline reached; ${store.slug} and later stores not started.`);
        break;
      }

      const summary = await refreshStoreWithRetries(store.slug, () => refreshStore(store, modules, options, supabase), settings);
      checkpoint.done[store.slug] = summary;
      await writeJsonAtomic(checkpointPath, checkpoint);
      printStoreSummary(summary);

      if (summary.status === 'failed' || summary.status === 'skipped') {
        const reason = summary.warnings.find((warning) => warning.startsWith('BLOCKING:')) ?? summary.warnings[0] ?? '';
        await notifier.send(`${store.slug} ${summary.status}`, reason.slice(0, 400), { tags: 'warning' });
      }
      if (Date.now() - lastProgressAt >= settings.progressIntervalMs) {
        lastProgressAt = Date.now();
        await notifier.send('progress', formatProgress(checkpoint, storeSlugs, new Date()), { priority: 'low' });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Price Hub scheduled refresh aborted: ${message}`);
    await notifier.send('aborted', `${message.slice(0, 400)}\n${formatProgress(checkpoint, storeSlugs, new Date())}`, { priority: 'high', tags: 'rotating_light' });
    return 1;
  }

  if (stopRequested) {
    return 143;
  }

  const report = buildRunReport(checkpoint, storeSlugs, new Date());
  await writeJsonAtomic(reportPath, report);
  await rm(checkpointPath, { force: true });
  console.log(formatFinal(report));
  await notifier.send(
    `finished ${report.status}`,
    formatFinal(report),
    report.status === 'ok' ? { tags: 'white_check_mark' } : { priority: 'high', tags: 'warning' },
  );
  return report.status === 'ok' ? 0 : 1;
}

function readPositiveNumber(value: string | undefined, fallback: number, name: string): number {
  const parsed = readNonNegativeNumber(value, fallback, name);
  if (parsed === 0) {
    throw new Error(`${name} must be greater than zero.`);
  }
  return parsed;
}

function readNonNegativeNumber(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }
  return parsed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
