import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HOME_TOUR_TABS } from '../../home-copy';
import { HomeSystemTourComponent } from './home-system-tour.component';

describe('HomeSystemTourComponent', () => {
  let fixture: ComponentFixture<HomeSystemTourComponent>;
  let host: HTMLElement;

  const tabs = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const visiblePanels = () => Array.from(host.querySelectorAll<HTMLElement>('[role="tabpanel"]')).filter(p => !p.hidden);
  const press = (target: HTMLElement, key: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeSystemTourComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeSystemTourComponent);
    fixture.componentRef.setInput('tabs', HOME_TOUR_TABS);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('shows only the first panel initially', () => {
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(visiblePanels().length).toBe(1);
    expect(visiblePanels()[0].id).toBe('home-tour-panel-library');
  });

  it('switches panels on click', () => {
    tabs()[2].click();
    fixture.detectChanges();
    expect(visiblePanels()[0].id).toBe('home-tour-panel-patches');
    expect(tabs()[2].getAttribute('tabindex')).toBe('0');
    expect(tabs()[0].getAttribute('tabindex')).toBe('-1');
  });

  it('supports arrow, Home and End keys with wrap-around', () => {
    press(tabs()[0], 'ArrowLeft');
    expect(visiblePanels()[0].id).toBe('home-tour-panel-patches');

    press(tabs()[2], 'ArrowRight');
    expect(visiblePanels()[0].id).toBe('home-tour-panel-library');

    press(tabs()[0], 'End');
    expect(visiblePanels()[0].id).toBe('home-tour-panel-patches');

    press(tabs()[2], 'Home');
    expect(visiblePanels()[0].id).toBe('home-tour-panel-library');
  });

  it('links every panel to its tab for assistive tech', () => {
    for (const panel of Array.from(host.querySelectorAll<HTMLElement>('[role="tabpanel"]'))) {
      const labelledBy = panel.getAttribute('aria-labelledby');
      expect(labelledBy && host.querySelector(`#${labelledBy}`)).toBeTruthy();
    }
  });
});
