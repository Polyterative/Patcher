import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsightMetricBarComponent } from './insight-metric-bar.component';

describe('InsightMetricBarComponent', () => {
  let fixture: ComponentFixture<InsightMetricBarComponent>;
  let comp: InsightMetricBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InsightMetricBarComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(InsightMetricBarComponent);
    comp = fixture.componentInstance;
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('label defaults to empty string', () => {
    expect(comp.label).toBe('');
  });

  it('valueLabel defaults to empty string', () => {
    expect(comp.valueLabel).toBe('');
  });

  it('widthPercent defaults to 0', () => {
    expect(comp.widthPercent).toBe(0);
  });

  it('tone defaults to "brand"', () => {
    expect(comp.tone).toBe('brand');
  });

  it('exposes label, text value, and detail through an aria-label (no tone-only encoding)', () => {
    comp.label = 'Intellijel';
    comp.valueLabel = '14';
    comp.detail = '14 modules updated in the last 30 days';
    comp.widthPercent = 100;
    comp.tone = 'emerald';
    fixture.detectChanges();

    const bar = fixture.nativeElement.querySelector('.metric-bar') as HTMLElement;
    expect(bar.getAttribute('role')).toBe('img');
    expect(bar.getAttribute('aria-label')).toBe('Intellijel: 14. 14 modules updated in the last 30 days');
    expect(bar.textContent).toContain('Intellijel');
    expect(bar.textContent).toContain('14');
  });

  it('hides the decorative fill track from assistive technology', () => {
    comp.label = 'Intellijel';
    comp.valueLabel = '14';
    fixture.detectChanges();

    const track = fixture.nativeElement.querySelector('.metric-bar__track') as HTMLElement;
    expect(track.getAttribute('aria-hidden')).toBe('true');
  });
});
