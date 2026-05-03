import {
  ComponentFixture,
  TestBed
}                            from '@angular/core/testing';
import {
  PLATFORM_ID
}                            from '@angular/core';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { By }                from '@angular/platform-browser';
import { EventBannerComponent } from './event-banner.component';
import {
  ACTIVE_EVENT_BANNER,
  EVENT_BANNER_CONFIG,
  EventBannerConfig
}                            from './event-banner.config';


function daysFromNow(offset: number): string {
  const d = new Date(Date.now() + offset * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function configWithDates(startOffset: number, endOffset: number): EventBannerConfig {
  return {
    id:          'test-event',
    title:       'Test Event',
    description: 'Test description',
    startDate:   daysFromNow(startOffset),
    endDate:     daysFromNow(endOffset),
  };
}

describe('EventBannerComponent', () => {
  let fixture: ComponentFixture<EventBannerComponent>;
  let component: EventBannerComponent;

  function setup(overrideConfig: EventBannerConfig | null, platformId: string = 'browser') {
    TestBed.configureTestingModule({
      declarations: [EventBannerComponent],
      imports:      [MatButtonModule, MatIconModule],
      providers:    [
        { provide: PLATFORM_ID,          useValue: platformId },
        { provide: EVENT_BANNER_CONFIG,  useValue: overrideConfig },
      ],
    });
    fixture   = TestBed.createComponent(EventBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => TestBed.resetTestingModule());
  afterEach(() => localStorage.clear());

  it('should be visible when now is inside date range', (done) => {
    setup(configWithDates(-1, 1));
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeTrue();
      done();
    });
  });

  it('should be hidden when now is before startDate', (done) => {
    setup(configWithDates(5, 10));
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeFalse();
      done();
    });
  });

  it('should be hidden when now is after endDate', (done) => {
    setup(configWithDates(-10, -2));
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeFalse();
      done();
    });
  });

  it('should be hidden when ACTIVE_EVENT_BANNER is null', (done) => {
    setup(null);
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeFalse();
      done();
    });
  });

  it('should be hidden on server platform regardless of date range', (done) => {
    setup(configWithDates(-1, 1), 'server');
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeFalse();
      done();
    });
  });

  it('should render CTA link when ctaUrl and ctaLabel are set', () => {
    setup({
      ...configWithDates(-1, 1),
      ctaLabel: 'Go there',
      ctaUrl:   'https://example.com',
    });
    const cta = fixture.debugElement.query(By.css('.event-banner__cta'));
    expect(cta).not.toBeNull();
    expect(cta.nativeElement.getAttribute('href')).toBe('https://example.com');
    expect(cta.nativeElement.textContent.trim()).toBe('Go there');
    expect(cta.nativeElement.getAttribute('target')).toBe('_blank');
    expect(cta.nativeElement.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should not render CTA link when ctaUrl is absent', () => {
    setup(configWithDates(-1, 1));
    const cta = fixture.debugElement.query(By.css('.event-banner__cta'));
    expect(cta).toBeNull();
  });

  it('should hide banner when dismiss is called', (done) => {
    setup(configWithDates(-1, 1));
    component.dismiss();
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeFalse();
      done();
    });
  });

  it('should persist dismissal across component instances for the same event id', (done) => {
    const config = configWithDates(-1, 1);

    setup(config);
    component.dismiss();
    fixture.destroy();
    TestBed.resetTestingModule();

    setup(config);
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeFalse();
      done();
    });
  });

  it('should keep dismissal scoped to the active event id', (done) => {
    setup(configWithDates(-1, 1));
    component.dismiss();
    fixture.destroy();
    TestBed.resetTestingModule();

    setup({
      ...configWithDates(-1, 1),
      id: 'different-event',
    });
    component.isVisible$.subscribe(visible => {
      expect(visible).toBeTrue();
      done();
    });
  });

  it('ACTIVE_EVENT_BANNER export should have a valid date range', () => {
    if (ACTIVE_EVENT_BANNER === null) {
      pending('ACTIVE_EVENT_BANNER is null — no date range to validate');
      return;
    }
    const start = new Date(ACTIVE_EVENT_BANNER.startDate).getTime();
    const end   = new Date(`${ACTIVE_EVENT_BANNER.endDate}T23:59:59`).getTime();
    expect(start).toBeLessThanOrEqual(end);
  });

  // ─── Marquee tests ──────────────────────────────────────────────────────

  it('should expose isMarqueeVisible$ as false when config is null', (done) => {
    setup(null);
    component.isMarqueeVisible$.subscribe(v => {
      expect(v).toBeFalse();
      done();
    });
  });

  it('should expose isMarqueeVisible$ as false when marquee is absent from config', (done) => {
    setup(configWithDates(-1, 1));
    component.isMarqueeVisible$.subscribe(v => {
      expect(v).toBeFalse();
      done();
    });
  });

  it('should expose isMarqueeVisible$ as true when marquee window is active', (done) => {
    setup({
      ...configWithDates(-1, 1),
      marquee: { text: 'Hello!', startDate: daysFromNow(-1), endDate: daysFromNow(1) },
    });
    component.isMarqueeVisible$.subscribe(v => {
      expect(v).toBeTrue();
      done();
    });
  });

  it('should expose isMarqueeVisible$ as false when marquee window is future', (done) => {
    setup({
      ...configWithDates(-2, 5),
      marquee: { text: 'Hello!', startDate: daysFromNow(2), endDate: daysFromNow(5) },
    });
    component.isMarqueeVisible$.subscribe(v => {
      expect(v).toBeFalse();
      done();
    });
  });

  it('should hide marquee when dismiss is called', (done) => {
    setup({
      ...configWithDates(-1, 1),
      marquee: { text: 'Hello!', startDate: daysFromNow(-1), endDate: daysFromNow(1) },
    });
    component.dismiss();
    component.isMarqueeVisible$.subscribe(v => {
      expect(v).toBeFalse();
      done();
    });
  });

  it('should fall back to config date range when marquee has no own dates', (done) => {
    setup({
      ...configWithDates(-1, 1),
      marquee: { text: 'Hello!' },
    });
    component.isMarqueeVisible$.subscribe(v => {
      expect(v).toBeTrue();
      done();
    });
  });
});
