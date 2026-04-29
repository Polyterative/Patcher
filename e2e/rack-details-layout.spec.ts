import {
  expect,
  Page,
  test
} from '@playwright/test';


const FHD_VIEWPORT = {
  width: 1920,
  height: 1080
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
