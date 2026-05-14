import { GeneralContextMenuDataService } from './general-context-menu-data.service';

describe('GeneralContextMenuDataService', () => {
  let service: GeneralContextMenuDataService;

  function fakeEvent(clientX: number, clientY: number): MouseEvent {
    return {clientX, clientY} as MouseEvent;
  }

  beforeEach(() => {
    service = new GeneralContextMenuDataService();
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('initializes with empty menuItems$ and default position at (0px, 0px)', () => {
    expect(service.menuItems$.value).toEqual([]);
    expect(service.positionData$.value).toEqual({x: '0px', y: '0px'});
  });

  it('clampPosition returns px-string coordinates for a mid-viewport click', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1024);
    spyOnProperty(window, 'innerHeight').and.returnValue(768);
    Object.defineProperty(window, 'visualViewport', {value: null, configurable: true});

    const result = service.clampPosition(fakeEvent(400, 300), 5);

    expect(result.x).toMatch(/^\d+px$/);
    expect(result.y).toMatch(/^\d+px$/);
  });

  it('clamps x coordinate so menu does not overflow the right edge', () => {
    Object.defineProperty(window, 'visualViewport', {value: null, configurable: true});
    spyOnProperty(window, 'innerWidth').and.returnValue(400);
    spyOnProperty(window, 'innerHeight').and.returnValue(800);

    const result = service.clampPosition(fakeEvent(399, 100), 3);

    // estimatedMenuWidthPx = 18 * 16 = 288; margin = 12; max x = 400 - 288 - 12 = 100
    const xPx = parseInt(result.x, 10);
    expect(xPx).toBeLessThanOrEqual(100);
  });

  it('clamps y coordinate so menu does not overflow the bottom edge', () => {
    Object.defineProperty(window, 'visualViewport', {value: null, configurable: true});
    spyOnProperty(window, 'innerWidth').and.returnValue(1000);
    spyOnProperty(window, 'innerHeight').and.returnValue(200);

    const result = service.clampPosition(fakeEvent(100, 199), 4);

    // estimatedMenuHeightPx = 4 * 48 = 192; margin = 12; max y = 200 - 192 - 12 = -4 → clamped to marginPx = 12
    const yPx = parseInt(result.y, 10);
    expect(yPx).toBeLessThanOrEqual(12);
  });

  it('caps estimated menu height at 8 items (8 * 48 = 384 logical units) even for large item counts', () => {
    Object.defineProperty(window, 'visualViewport', {value: null, configurable: true});
    spyOnProperty(window, 'innerWidth').and.returnValue(2000);
    spyOnProperty(window, 'innerHeight').and.returnValue(2000);

    const result5 = service.clampPosition(fakeEvent(100, 100), 5);
    const result50 = service.clampPosition(fakeEvent(100, 100), 50);

    // With a tall enough viewport both should succeed; the important thing is
    // clamping at 8 rows means the 50-item result is no more restrictive than 8.
    expect(result5.y).toEqual(result50.y);
  });
});
