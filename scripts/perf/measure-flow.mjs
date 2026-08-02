import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const FLOW_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const DEFAULT_RUNS = 5;
const DEFAULT_SETTLE_MS = 5_000;
const MAX_RUNS = 20;
const MAX_SETTLE_MS = 60_000;

export function parseArguments(argumentsList) {
  const options = {
    flow: undefined,
    url: undefined,
    runs: DEFAULT_RUNS,
    settleMs: DEFAULT_SETTLE_MS,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const value = argumentsList[index + 1];

    if (argument === '--' && index === 0) {
      continue;
    }
    if (!['--flow', '--url', '--runs', '--settle-ms'].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${argument}`);
    }

    switch (argument) {
      case '--flow':
        options.flow = value;
        break;
      case '--url':
        options.url = value;
        break;
      case '--runs':
        options.runs = Number(value);
        break;
      case '--settle-ms':
        options.settleMs = Number(value);
        break;
    }
    index += 1;
  }

  if (!options.flow || !FLOW_NAME_PATTERN.test(options.flow)) {
    throw new Error('flow must use lowercase letters, numbers, and hyphens only');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    throw new Error('url must be a valid HTTP or HTTPS URL');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new Error('url must be a credential-free HTTP or HTTPS URL');
  }
  if (!Number.isInteger(options.runs) || options.runs < 1 || options.runs > MAX_RUNS) {
    throw new Error(`runs must be an integer between 1 and ${MAX_RUNS}`);
  }
  if (!Number.isInteger(options.settleMs) || options.settleMs < 0 || options.settleMs > MAX_SETTLE_MS) {
    throw new Error(`settle-ms must be an integer between 0 and ${MAX_SETTLE_MS}`);
  }

  return options;
}

export function summarizeRuns(runs) {
  const states = ['cold', 'warm'];

  return Object.fromEntries(states.map(cacheState => {
    const stateRuns = runs.filter(run => run.cacheState === cacheState);
    if (!stateRuns.length) {
      throw new Error(`No ${cacheState} runs were recorded`);
    }

    const numericKeys = Object.keys(stateRuns[0]).filter(key => (
      key !== 'cacheState' && typeof stateRuns[0][key] === 'number'
    ));
    return [
      cacheState,
      Object.fromEntries(numericKeys.map(key => [
        key,
        median(stateRuns.map(run => run[key])),
      ])),
    ];
  }));
}

export function calculateDurationMetrics(initialMetrics, finalMetrics) {
  const elapsedMs = metricName => (
    Math.max(0, (finalMetrics[metricName] ?? 0) - (initialMetrics[metricName] ?? 0)) * 1_000
  );
  const roundMilliseconds = value => Math.round(value * 1_000) / 1_000;

  return {
    taskDurationMs: roundMilliseconds(elapsedMs('TaskDuration')),
    scriptDurationMs: roundMilliseconds(elapsedMs('ScriptDuration')),
    layoutDurationMs: roundMilliseconds(
      elapsedMs('LayoutDuration') + elapsedMs('RecalcStyleDuration')
    ),
  };
}

export function remainingMeasurementWaitMs(windowMs, startedAtMs, currentTimeMs) {
  return Math.max(0, windowMs - (currentTimeMs - startedAtMs));
}

async function measureFlow(options) {
  const outputDirectory = path.resolve('tmp', 'perf', options.flow);
  await mkdir(outputDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const runs = [];

  try {
    for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const tracePath = path.join(outputDirectory, `run-${runNumber}.zip`);

      try {
        await context.tracing.start({ screenshots: true, snapshots: true });
        const page = await context.newPage();
        await installPerformanceObservers(page);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');

        runs.push(await captureNavigation({
          page,
          cdp,
          url: options.url,
          settleMs: options.settleMs,
          cacheState: 'cold',
          outputDirectory,
          runNumber,
        }));
        runs.push(await captureNavigation({
          page,
          cdp,
          url: options.url,
          settleMs: options.settleMs,
          cacheState: 'warm',
          outputDirectory,
          runNumber,
        }));
      } finally {
        await context.tracing.stop({ path: tracePath });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const aggregate = {
    generatedAt: new Date().toISOString(),
    flow: options.flow,
    runs: options.runs,
    viewport: { width: 1440, height: 900 },
    settleMs: options.settleMs,
    median: summarizeRuns(runs),
    measurements: runs,
  };
  await writeJson(path.join(outputDirectory, 'aggregate.json'), aggregate);
  return { aggregate, outputDirectory };
}

async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    window.__patcherPerformance = {
      cls: 0,
      lcpMs: 0,
      longTasks: [],
    };

    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        window.__patcherPerformance.longTasks.push(entry.duration);
      }
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) {
        window.__patcherPerformance.lcpMs = latest.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__patcherPerformance.cls += entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

async function captureNavigation({
  page,
  cdp,
  url,
  settleMs,
  cacheState,
  outputDirectory,
  runNumber,
}) {
  const initialCdpMetrics = toMetricMap(await cdp.send('Performance.getMetrics'));
  const navigationStartedAt = Date.now();
  const response = cacheState === 'cold'
    ? await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    : await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
  if (!response) {
    throw new Error(`${cacheState} navigation did not receive a document response`);
  }
  if (response.status() >= 400) {
    throw new Error(`${cacheState} navigation returned HTTP ${response.status()}`);
  }
  const remainingWaitMs = remainingMeasurementWaitMs(settleMs, navigationStartedAt, Date.now());
  if (remainingWaitMs) {
    await page.waitForTimeout(remainingWaitMs);
  }

  const [navigation, resources, pageMetrics, metrics, heap] = await Promise.all([
    page.evaluate(() => performance.getEntriesByType('navigation')[0]?.toJSON()),
    page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.toJSON())),
    page.evaluate(() => ({
      ...window.__patcherPerformance,
      domNodes: document.getElementsByTagName('*').length,
    })),
    cdp.send('Performance.getMetrics'),
    cdp.send('Runtime.getHeapUsage'),
  ]);
  const cdpMetrics = toMetricMap(metrics);
  const measurement = {
    cacheState,
    status: response.status(),
    ttfbMs: navigation?.responseStart ?? 0,
    domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
    loadMs: navigation?.loadEventEnd ?? 0,
    lcpMs: pageMetrics.lcpMs,
    cls: pageMetrics.cls,
    longTaskCount: pageMetrics.longTasks.length,
    longestTaskMs: Math.max(0, ...pageMetrics.longTasks),
    domNodes: pageMetrics.domNodes,
    totalTransferBytes: sumResources(resources),
    scriptTransferBytes: sumResources(resources, resource => resource.initiatorType === 'script'),
    requestCount: resources.length,
    thirdPartyRequestCount: countThirdPartyResources(resources, url),
    jsHeapBytes: heap.usedSize,
    ...calculateDurationMetrics(initialCdpMetrics, cdpMetrics),
  };
  const filenamePrefix = `${cacheState}-${runNumber}`;
  await Promise.all([
    writeJson(path.join(outputDirectory, `${filenamePrefix}.json`), {
      measurement,
      largestResources: resources
        .map(resource => ({
          name: redactResourceUrl(resource.name),
          initiatorType: resource.initiatorType,
          transferSize: resource.transferSize,
        }))
        .sort((left, right) => right.transferSize - left.transferSize)
        .slice(0, 20),
    }),
    page.screenshot({
      path: path.join(outputDirectory, `${filenamePrefix}.png`),
      fullPage: true,
    }),
  ]);

  return measurement;
}

function sumResources(resources, predicate = () => true) {
  return resources
    .filter(predicate)
    .reduce((total, resource) => total + (resource.transferSize ?? 0), 0);
}

function countThirdPartyResources(resources, pageUrl) {
  const pageOrigin = new URL(pageUrl).origin;
  return resources.filter(resource => new URL(resource.name).origin !== pageOrigin).length;
}

function redactResourceUrl(resourceUrl) {
  const parsedUrl = new URL(resourceUrl);
  return `${parsedUrl.origin}${parsedUrl.pathname}`;
}

function toMetricMap({ metrics }) {
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { aggregate, outputDirectory } = await measureFlow(options);
  console.log(JSON.stringify({
    flow: aggregate.flow,
    outputDirectory,
    median: aggregate.median,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
