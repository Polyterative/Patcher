import {
  expect,
  Page,
  test
} from '@playwright/test';


const FHD_VIEWPORT = {
  width: 1920,
  height: 1080
} as const;
const SUMMARY_DESKTOP_VIEWPORT = {
  width: 1280,
  height: 1400
} as const;
const SUMMARY_TABLET_VIEWPORT = {
  width: 980,
  height: 1400
} as const;
const SUMMARY_MID_DESKTOP_VIEWPORT = {
  width: 1100,
  height: 1400
} as const;
const SUMMARY_WIDE_DESKTOP_VIEWPORT = {
  width: 1680,
  height: 1400
} as const;
const MOBILE_VIEWPORT = {
  width: 390,
  height: 844
} as const;
const WIDE_RACK_ID = 464;
const STABLE_RACK_ID = 265;
const EDGE_TOLERANCE_PX = 1;

type RackViewportMetrics = {
  canvasLeft: number;
  canvasRight: number;
  containerLeft: number;
  containerRight: number;
  containerScrollWidth: number;
  containerClientWidth: number;
};

type RackEdgeMetrics = {
  itemLeft: number;
  itemRight: number;
  containerLeft: number;
  containerRight: number;
  scrollLeft: number;
  maxScrollLeft: number;
};

type SummaryLayoutMetrics = {
  summaryDisplay: string;
  compositeLeft: number;
  compositeTop: number;
  statsLeft: number;
  statsTop: number;
  statsWidth: number;
  desktopAnalysisDisplay: string;
  desktopAnalysisLeft: number;
  desktopAnalysisTop: number;
  desktopAnalysisWidth: number;
  mobileAnalysisDisplay: string;
  mobileAnalysisWidth: number;
  visualSurfaceColumns: string;
  chartTop: number;
  supportingStatsTop: number;
  visualSurfaceOverflowX: boolean;
  axisListOverflowX: boolean;
};

async function openRackDetails(page: Page, rackId: number): Promise<void> {
  await page.goto(`/racks/details/${ rackId }`);
  await expect(page).toHaveURL(new RegExp(`/racks/details/${ rackId }(?:$|[?#])`), {timeout: 15_000});

  const rackComposite = page.locator('app-rack-composite').first();
  const visibleRackViewport = page.locator('app-rack-editor .scroll').first();
  const rackCanvas = page.locator('#screen').first();

  await expect(rackComposite).toBeVisible({timeout: 15_000});
  await expect(visibleRackViewport).toBeVisible({timeout: 15_000});
  await expect(rackCanvas).toBeVisible({timeout: 15_000});
  await page.waitForFunction(() => document.querySelectorAll('#screen .module').length > 0, {timeout: 15_000});
  await page.waitForTimeout(1_000);
}

async function readRackViewportMetrics(page: Page): Promise<RackViewportMetrics> {
  const metrics = await page.evaluate<RackViewportMetrics | null>(() => {
    const canvas = document.querySelector<HTMLElement>('#screen');
    const container = document.querySelector<HTMLElement>('app-rack-editor .scroll');

    if (!canvas || !container) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      canvasLeft: Math.round(canvasRect.left),
      canvasRight: Math.round(canvasRect.right),
      containerLeft: Math.round(containerRect.left),
      containerRight: Math.round(containerRect.right),
      containerScrollWidth: container.scrollWidth,
      containerClientWidth: container.clientWidth
    };
  });

  expect(metrics).not.toBeNull();
  return metrics!;
}

async function readRackEdgeMetrics(page: Page, selector: string): Promise<RackEdgeMetrics> {
  const metrics = await page.evaluate<RackEdgeMetrics | null>((itemSelector) => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(itemSelector));
    const item = items.at(-1) ?? null;
    const container = document.querySelector<HTMLElement>('app-rack-editor .scroll');

    if (!item || !container) {
      return null;
    }

    const itemRect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      itemLeft: Math.round(itemRect.left),
      itemRight: Math.round(itemRect.right),
      containerLeft: Math.round(containerRect.left),
      containerRight: Math.round(containerRect.right),
      scrollLeft: container.scrollLeft,
      maxScrollLeft: container.scrollWidth - container.clientWidth
    };
  }, selector);

  expect(metrics).not.toBeNull();
  return metrics!;
}

async function scrollRackViewportToEnd(page: Page): Promise<void> {
  await page.locator('app-rack-editor .scroll').first().evaluate(container => {
    container.scrollLeft = container.scrollWidth;
  });
  await page.waitForTimeout(500);
}

async function readSummaryLayoutMetrics(page: Page): Promise<SummaryLayoutMetrics> {
  const metrics = await page.evaluate<SummaryLayoutMetrics | null>(() => {
    const summary = document.querySelector<HTMLElement>('.rackBrowserDetailView__summaryLayout');
    const composite = document.querySelector<HTMLElement>('.rackBrowserDetailView__summaryLayout app-rack-composite');
    const stats = document.querySelector<HTMLElement>('.rackBrowserDetailView__summaryStats');
    const desktopAnalysis = document.querySelector<HTMLElement>('.rackBrowserDetailView__desktopAnalysis');
    const mobileAnalysis = document.querySelector<HTMLElement>('.rackBrowserDetailView__mobileAnalysis');
    const visualSurface = document.querySelector<HTMLElement>('.rackBalancePanel__visualSurface');
    const axisList = document.querySelector<HTMLElement>('.rackBalancePanel__axisList');
    const chartWrap = document.querySelector<HTMLElement>('.rackBalancePanel__chartWrap');
    const supportingStats = document.querySelector<HTMLElement>('.rackBalancePanel__supportingStats');

    if (!summary || !composite || !stats || !desktopAnalysis || !mobileAnalysis) {
      return null;
    }

    const summaryStyle = getComputedStyle(summary);
    const desktopAnalysisStyle = getComputedStyle(desktopAnalysis);
    const mobileAnalysisStyle = getComputedStyle(mobileAnalysis);
    const compositeRect = composite.getBoundingClientRect();
    const statsRect = stats.getBoundingClientRect();
    const desktopAnalysisRect = desktopAnalysis.getBoundingClientRect();
    const mobileAnalysisRect = mobileAnalysis.getBoundingClientRect();

    return {
      summaryDisplay: summaryStyle.display,
      compositeLeft: Math.round(compositeRect.left),
      compositeTop: Math.round(compositeRect.top),
      statsLeft: Math.round(statsRect.left),
      statsTop: Math.round(statsRect.top),
      statsWidth: Math.round(statsRect.width),
      desktopAnalysisDisplay: desktopAnalysisStyle.display,
      desktopAnalysisLeft: Math.round(desktopAnalysisRect.left),
      desktopAnalysisTop: Math.round(desktopAnalysisRect.top),
      desktopAnalysisWidth: Math.round(desktopAnalysisRect.width),
      mobileAnalysisDisplay: mobileAnalysisStyle.display,
      mobileAnalysisWidth: Math.round(mobileAnalysisRect.width),
      visualSurfaceColumns: getComputedStyle(visualSurface ?? summary).gridTemplateColumns,
      chartTop: Math.round(chartWrap?.getBoundingClientRect().top ?? 0),
      supportingStatsTop: Math.round(supportingStats?.getBoundingClientRect().top ?? 0),
      visualSurfaceOverflowX: !!visualSurface && visualSurface.scrollWidth > visualSurface.clientWidth + 1,
      axisListOverflowX: !!axisList && axisList.scrollWidth > axisList.clientWidth + 1
    };
  });

  expect(metrics).not.toBeNull();
  return metrics!;
}

test.describe('Rack Details Layout', () => {
  test.use({viewport: FHD_VIEWPORT});

  test('wide rack canvas remains fully visible on FHD screens', async ({page}) => {
    await openRackDetails(page, WIDE_RACK_ID);

    const metrics = await readRackViewportMetrics(page);

    expect(metrics.canvasLeft, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.containerLeft - EDGE_TOLERANCE_PX);
    expect(metrics.canvasRight, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.containerRight + EDGE_TOLERANCE_PX);
  });

  test('desktop rack canvas stays fully visible for stable rack 265', async ({page}) => {
    await openRackDetails(page, STABLE_RACK_ID);

    const metrics = await readRackViewportMetrics(page);

    expect(metrics.containerScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.containerClientWidth);
    expect(metrics.canvasLeft, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.containerLeft - EDGE_TOLERANCE_PX);
    expect(metrics.canvasRight, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.containerRight + EDGE_TOLERANCE_PX);
  });

  test('public rack balance details are visible immediately on desktop', async ({page}) => {
    await openRackDetails(page, WIDE_RACK_ID);

    await expect(page.locator('.rackBrowserDetailView__desktopAnalysis .rackBalancePanel__details').first()).toBeVisible();
    await expect(page.locator('.rackBrowserDetailView__desktopAnalysis .rackBalancePanel__toggleButton')).toHaveCount(0);
  });
});

test.describe('Rack Details Layout Mobile', () => {
  test.use({viewport: MOBILE_VIEWPORT});

  test('mobile rack viewport keeps the right edge reachable for stable rack 265', async ({page}) => {
    await openRackDetails(page, STABLE_RACK_ID);

    const initialMetrics = await readRackEdgeMetrics(page, '#screen .module');
    if (initialMetrics.itemRight > initialMetrics.containerRight) {
      expect(initialMetrics.maxScrollLeft, JSON.stringify(initialMetrics)).toBeGreaterThan(0);
      await scrollRackViewportToEnd(page);
    }

    const scrolledMetrics = await readRackEdgeMetrics(page, '#screen .module');

    expect(scrolledMetrics.itemLeft, JSON.stringify(scrolledMetrics)).toBeGreaterThanOrEqual(scrolledMetrics.containerLeft - EDGE_TOLERANCE_PX);
    expect(scrolledMetrics.itemRight, JSON.stringify(scrolledMetrics)).toBeLessThanOrEqual(scrolledMetrics.containerRight + EDGE_TOLERANCE_PX);
  });
});

test.describe('Rack Details Summary Layout Desktop', () => {
  test.use({viewport: SUMMARY_DESKTOP_VIEWPORT});

  test('desktop summary keeps three-column sizing without radar overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('grid');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.statsTop, JSON.stringify(metrics)).toBe(metrics.compositeTop);
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.compositeTop);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThan(metrics.desktopAnalysisWidth);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Mid Desktop', () => {
  test.use({viewport: SUMMARY_MID_DESKTOP_VIEWPORT});

  test('mid desktop keeps the analysis panel internally stacked without overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('grid');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsTop);
    expect(metrics.chartTop, JSON.stringify(metrics)).toBeLessThan(metrics.supportingStatsTop);
    expect(metrics.visualSurfaceColumns, JSON.stringify(metrics)).not.toContain(' ');
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Wide Desktop', () => {
  test.use({viewport: SUMMARY_WIDE_DESKTOP_VIEWPORT});

  test('wide desktop radar uses a side by side analysis layout without overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('grid');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.desktopAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(380);
    expect(metrics.chartTop, JSON.stringify(metrics)).toBe(metrics.supportingStatsTop);
    expect(metrics.visualSurfaceColumns, JSON.stringify(metrics)).toContain(' ');
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Tablet', () => {
  test.use({viewport: SUMMARY_TABLET_VIEWPORT});

  test('tablet summary keeps stats wide while analysis drops below without overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('grid');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.statsTop, JSON.stringify(metrics)).toBe(metrics.compositeTop);
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBe(metrics.statsLeft);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThan(metrics.desktopAnalysisWidth);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Mobile', () => {
  test.use({viewport: MOBILE_VIEWPORT});

  test('mobile summary hides the desktop analysis panel and keeps the mobile panel active', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThan(0);
  });
});
