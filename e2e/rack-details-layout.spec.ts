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
const SUMMARY_IPAD_PRO_LANDSCAPE_VIEWPORT = {
  width: 1280,
  height: 1024
} as const;
const SUMMARY_COMPACT_DESKTOP_VIEWPORT = {
  width: 1140,
  height: 1400
} as const;
const SUMMARY_1130_DESKTOP_VIEWPORT = {
  width: 1130,
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
const SUMMARY_1728_DESKTOP_VIEWPORT = {
  width: 1728,
  height: 1400
} as const;
const SUMMARY_ULTRA_WIDE_DESKTOP_VIEWPORT = {
  width: 1760,
  height: 1400
} as const;
const MOBILE_VIEWPORT = {
  width: 390,
  height: 844
} as const;
const WIDE_RACK_ID = 464;
const STABLE_RACK_ID = 265;
const EDGE_TOLERANCE_PX = 1;
const HUGGED_COMMENTS_MAX_WIDTH_PX = 721;

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
  summaryRight: number;
  compositeLeft: number;
  compositeTop: number;
  rightColumnRight: number;
  rightColumnWidth: number;
  statsLeft: number;
  statsTop: number;
  statsWidth: number;
  bottomCommentsDisplay: string;
  bottomCommentsTop: number;
  bottomCommentsWidth: number;
  editorTop: number;
  desktopAnalysisDisplay: string;
  desktopAnalysisLeft: number;
  desktopAnalysisTop: number;
  desktopAnalysisHeight: number;
  desktopAnalysisWidth: number;
  mobileAnalysisDisplay: string;
  mobileAnalysisWidth: number;
  visualSurfaceColumns: string;
  chartTop: number;
  supportingStatsTop: number;
  axisSectionTop: number;
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
    const rightColumn = document.querySelector<HTMLElement>('.rackBrowserDetailView__summaryColumn--right');
    const stats = document.querySelector<HTMLElement>('.rackBrowserDetailView__summaryStats');
    const bottomComments = document.querySelector<HTMLElement>('.rackBrowserDetailView__bottomComments .content')
      ?? document.querySelector<HTMLElement>('.rackBrowserDetailView__bottomComments');
    const editorCard = document.querySelector<HTMLElement>('app-rack-editor')?.closest('lib-clean-card') as HTMLElement | null;
    const desktopAnalysis = document.querySelector<HTMLElement>('.rackBrowserDetailView__desktopAnalysis');
    const mobileAnalysis = document.querySelector<HTMLElement>('.rackBrowserDetailView__mobileAnalysis');
    const visualSurface = document.querySelector<HTMLElement>('.rackBalancePanel__visualSurface');
    const axisList = document.querySelector<HTMLElement>('.rackBalancePanel__axisList');
    const chartWrap = document.querySelector<HTMLElement>('.rackBalancePanel__chartWrap');
    const supportingStats = document.querySelector<HTMLElement>('.rackBalancePanel__supportingStats');
    const axisSection = document.querySelector<HTMLElement>('.rackBalancePanel__axisSection');

    if (!summary || !composite || !rightColumn || !stats || !bottomComments || !editorCard || !desktopAnalysis || !mobileAnalysis) {
      return null;
    }

    const summaryStyle = getComputedStyle(summary);
    const bottomCommentsStyle = getComputedStyle(bottomComments);
    const desktopAnalysisStyle = getComputedStyle(desktopAnalysis);
    const mobileAnalysisStyle = getComputedStyle(mobileAnalysis);
    const summaryRect = summary.getBoundingClientRect();
    const compositeRect = composite.getBoundingClientRect();
    const rightColumnRect = rightColumn.getBoundingClientRect();
    const statsRect = stats.getBoundingClientRect();
    const bottomCommentsRect = bottomComments.getBoundingClientRect();
    const editorRect = editorCard.getBoundingClientRect();
    const desktopAnalysisRect = desktopAnalysis.getBoundingClientRect();
    const mobileAnalysisRect = mobileAnalysis.getBoundingClientRect();

    return {
      summaryDisplay: summaryStyle.display,
      summaryRight: Math.round(summaryRect.right),
      compositeLeft: Math.round(compositeRect.left),
      compositeTop: Math.round(compositeRect.top),
      rightColumnRight: Math.round(rightColumnRect.right),
      rightColumnWidth: Math.round(rightColumnRect.width),
      statsLeft: Math.round(statsRect.left),
      statsTop: Math.round(statsRect.top),
      statsWidth: Math.round(statsRect.width),
      bottomCommentsDisplay: bottomCommentsStyle.display,
      bottomCommentsTop: Math.round(bottomCommentsRect.top),
      bottomCommentsWidth: Math.round(bottomCommentsRect.width),
      editorTop: Math.round(editorRect.top),
      desktopAnalysisDisplay: desktopAnalysisStyle.display,
      desktopAnalysisLeft: Math.round(desktopAnalysisRect.left),
      desktopAnalysisTop: Math.round(desktopAnalysisRect.top),
      desktopAnalysisHeight: Math.round(desktopAnalysisRect.height),
      desktopAnalysisWidth: Math.round(desktopAnalysisRect.width),
      mobileAnalysisDisplay: mobileAnalysisStyle.display,
      mobileAnalysisWidth: Math.round(mobileAnalysisRect.width),
      visualSurfaceColumns: getComputedStyle(visualSurface ?? summary).gridTemplateColumns,
      chartTop: Math.round(chartWrap?.getBoundingClientRect().top ?? 0),
      supportingStatsTop: Math.round(supportingStats?.getBoundingClientRect().top ?? 0),
      axisSectionTop: Math.round(axisSection?.getBoundingClientRect().top ?? 0),
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

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.statsTop, JSON.stringify(metrics)).toBe(metrics.compositeTop);
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsLeft);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.bottomCommentsWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(HUGGED_COMMENTS_MAX_WIDTH_PX);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(300);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout iPad Pro Landscape', () => {
  test.use({viewport: SUMMARY_IPAD_PRO_LANDSCAPE_VIEWPORT});

  test('iPad Pro landscape uses the full summary row width for the stats and analysis blocks', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsLeft);
    expect(metrics.rightColumnRight, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.summaryRight - 8);
    expect(metrics.rightColumnWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(900);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(440);
    expect(metrics.desktopAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(440);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Mid Desktop', () => {
  test.use({viewport: SUMMARY_MID_DESKTOP_VIEWPORT});

  test('mid desktop keeps the analysis panel internally stacked without overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.statsLeft, JSON.stringify(metrics)).toBe(metrics.compositeLeft);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.bottomCommentsWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(HUGGED_COMMENTS_MAX_WIDTH_PX);
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsTop);
    expect(metrics.chartTop, JSON.stringify(metrics)).toBeLessThan(metrics.supportingStatsTop);
    expect(metrics.visualSurfaceColumns, JSON.stringify(metrics)).not.toContain(' ');
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Wide Desktop', () => {
  test.use({viewport: SUMMARY_WIDE_DESKTOP_VIEWPORT});

  test('wide desktop uses a compact balance analysis layout without overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.desktopAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(300);
    expect(metrics.chartTop, JSON.stringify(metrics)).toBe(metrics.supportingStatsTop);
    expect(metrics.axisSectionTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.supportingStatsTop);
    expect(metrics.desktopAnalysisHeight, JSON.stringify(metrics)).toBeLessThanOrEqual(300);
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsLeft);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.bottomCommentsWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(HUGGED_COMMENTS_MAX_WIDTH_PX);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout 1728 Desktop', () => {
  test.use({viewport: SUMMARY_1728_DESKTOP_VIEWPORT});

  test('1728 desktop keeps the balance analysis in the compact stacked-right layout', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.chartTop, JSON.stringify(metrics)).toBe(metrics.supportingStatsTop);
    expect(metrics.axisSectionTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.supportingStatsTop);
    expect(metrics.desktopAnalysisHeight, JSON.stringify(metrics)).toBeLessThanOrEqual(300);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Ultra Wide Desktop', () => {
  test.use({viewport: SUMMARY_ULTRA_WIDE_DESKTOP_VIEWPORT});

  test('ultra wide desktop gives the statistics block more width without breaking the two-column layout', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsLeft);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(440);
    expect(metrics.desktopAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(440);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.bottomCommentsWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(HUGGED_COMMENTS_MAX_WIDTH_PX);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Full HD Wide', () => {
  test.use({viewport: FHD_VIEWPORT});

  test('full hd keeps the balance analysis compact on the right column', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.supportingStatsTop, JSON.stringify(metrics)).toBe(metrics.chartTop);
    expect(metrics.axisSectionTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.supportingStatsTop);
    expect(metrics.desktopAnalysisHeight, JSON.stringify(metrics)).toBeLessThanOrEqual(285);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Compact Desktop', () => {
  test.use({viewport: SUMMARY_COMPACT_DESKTOP_VIEWPORT});

  test('compact desktop keeps stats and balance analysis side by side without wasting width', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsLeft);
    expect(metrics.rightColumnRight, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.summaryRight - 8);
    expect(metrics.rightColumnWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(760);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(370);
    expect(metrics.desktopAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(370);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout 1130 Desktop', () => {
  test.use({viewport: SUMMARY_1130_DESKTOP_VIEWPORT});

  test('1130 desktop avoids the breakpoint dead zone and keeps stats plus analysis aligned', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBe(metrics.statsTop);
    expect(metrics.desktopAnalysisLeft, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsLeft);
    expect(metrics.rightColumnRight, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.summaryRight - 8);
    expect(metrics.rightColumnWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(780);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(380);
    expect(metrics.desktopAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThanOrEqual(380);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Tablet', () => {
  test.use({viewport: SUMMARY_TABLET_VIEWPORT});

  test('tablet summary keeps stats wide while analysis drops below without overflow', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.statsLeft, JSON.stringify(metrics)).toBe(metrics.compositeLeft);
    expect(metrics.desktopAnalysisTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.statsTop);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
    expect(metrics.bottomCommentsWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(HUGGED_COMMENTS_MAX_WIDTH_PX);
    expect(metrics.statsWidth, JSON.stringify(metrics)).toBe(metrics.desktopAnalysisWidth);
    expect(metrics.visualSurfaceOverflowX, JSON.stringify(metrics)).toBe(false);
    expect(metrics.axisListOverflowX, JSON.stringify(metrics)).toBe(false);
  });
});

test.describe('Rack Details Summary Layout Mobile', () => {
  test.use({viewport: MOBILE_VIEWPORT});

  test('mobile summary hides the desktop analysis panel and keeps the mobile panel active', async ({page}) => {
    await openRackDetails(page, 559);

    const metrics = await readSummaryLayoutMetrics(page);

    expect(metrics.summaryDisplay, JSON.stringify(metrics)).toBe('flex');
    expect(metrics.desktopAnalysisDisplay, JSON.stringify(metrics)).toBe('none');
    expect(metrics.mobileAnalysisDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.bottomCommentsDisplay, JSON.stringify(metrics)).toBe('block');
    expect(metrics.mobileAnalysisWidth, JSON.stringify(metrics)).toBeGreaterThan(0);
    expect(metrics.bottomCommentsTop, JSON.stringify(metrics)).toBeGreaterThan(metrics.editorTop);
  });
});
