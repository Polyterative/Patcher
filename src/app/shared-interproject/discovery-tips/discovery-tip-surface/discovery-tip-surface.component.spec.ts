import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AppViewportService } from '../../app-viewport.service';
import { DiscoveryTipActive } from '../discovery-tip.models';
import { DiscoveryTipService } from '../discovery-tip.service';
import { DiscoveryTipSurfaceComponent, calculateDiscoveryTipPosition } from './discovery-tip-surface.component';


describe('DiscoveryTipSurfaceComponent', () => {
  let fixture: ComponentFixture<DiscoveryTipSurfaceComponent>;
  let activeTip$: BehaviorSubject<DiscoveryTipActive | null>;

  function rect({
    left = 0,
    top = 0,
    width = 100,
    height = 40
  }: { left?: number; top?: number; width?: number; height?: number }): DOMRect {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({})
    } as DOMRect;
  }

  beforeEach(async () => {
    activeTip$ = new BehaviorSubject<DiscoveryTipActive | null>(null);
    class ResizeObserverStub {
      constructor(_callback: ResizeObserverCallback) {}
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (window as unknown as {ResizeObserver: typeof ResizeObserver}).ResizeObserver = ResizeObserverStub;

    await TestBed.configureTestingModule({
      imports: [DiscoveryTipSurfaceComponent],
      providers: [
        {provide: PLATFORM_ID, useValue: 'browser'},
        {
          provide: DiscoveryTipService,
          useValue: {
            activeTip$: activeTip$.asObservable(),
            acknowledgeActiveTip: jasmine.createSpy('acknowledgeActiveTip'),
            snoozeActiveTip: jasmine.createSpy('snoozeActiveTip'),
            pauseAllTips: jasmine.createSpy('pauseAllTips'),
            startUserAreaTour: jasmine.createSpy('startUserAreaTour'),
            endGuidedTour: jasmine.createSpy('endGuidedTour')
          }
        },
        {
          provide: AppViewportService,
          useValue: {
            currentViewport: () => ({width: 1280, height: 720, offsetLeft: 0, offsetTop: 0})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoveryTipSurfaceComponent);
    fixture.detectChanges();
  });

  it('renders tip content without the removed Why this details UI', () => {
    const anchorElement = document.createElement('button');
    anchorElement.getBoundingClientRect = () => rect({left: 100, top: 100, width: 120, height: 40});
    anchorElement.scrollIntoView = () => undefined;

    activeTip$.next({
      definition: {
        id: 'tip-without-reason-ui',
        version: 1,
        introducedAt: '2026-06-17T00:00:00.000Z',
        anchorId: 'tip-anchor',
        title: 'Helpful title',
        body: 'Helpful body',
        routePrefixes: ['/user/area'],
        priority: 1,
        audience: 'all',
        isEligible: () => true
      },
      anchorElement
    });
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent as string;
    expect(textContent).toContain('Helpful title');
    expect(textContent).toContain('Helpful body');
    expect(textContent).not.toContain('Why this?');
    expect(fixture.nativeElement.querySelector('details.reason')).toBeNull();
  });
});


describe('calculateDiscoveryTipPosition', () => {
  function rect({
    left = 0,
    top = 0,
    width = 100,
    height = 40
  }: { left?: number; top?: number; width?: number; height?: number }): DOMRect {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({})
    } as DOMRect;
  }

  it('keeps taller tips fully inside the viewport when shown below a low anchor', () => {
    const position = calculateDiscoveryTipPosition(
      rect({left: 120, top: 560, width: 120, height: 48}),
      1280,
      720,
      'Your patches are becoming a recall library',
      'Once you have a few saved, use names and notes consistently so old sessions are easy to reopen under pressure.'
    );

    expect(position.side).toBe('above');
    expect(position.top).toBeGreaterThanOrEqual(16);
  });

  it('clamps the tip horizontally within the viewport', () => {
    const position = calculateDiscoveryTipPosition(
      rect({left: 1180, top: 180, width: 120, height: 48}),
      1280,
      720,
      'Helpful tip',
      'Keep going.'
    );

    expect(position.left).toBeLessThanOrEqual(1280 - 320 - 16);
    expect(position.left).toBeGreaterThanOrEqual(16);
  });

  it('shows below when anchor is in the upper half of viewport', () => {
    const position = calculateDiscoveryTipPosition(
      rect({left: 400, top: 100, width: 100, height: 40}),
      1280,
      720
    );

    expect(position.side).toBe('below');
    expect(position.top).toBeGreaterThan(100);
  });

  it('positions tip centered on anchor when viewport is wide enough', () => {
    const position = calculateDiscoveryTipPosition(
      rect({left: 600, top: 200, width: 80, height: 40}),
      1280,
      720
    );

    expect(position.left).toBeGreaterThanOrEqual(16);
    expect(position.left).toBeLessThanOrEqual(1280 - 16);
  });
});
