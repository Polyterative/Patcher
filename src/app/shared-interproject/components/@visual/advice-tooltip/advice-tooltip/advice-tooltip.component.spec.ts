import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { AdviceTooltipComponent } from './advice-tooltip.component';


describe('AdviceTooltipComponent', () => {
  let fixture: ComponentFixture<AdviceTooltipComponent>;
  let component: AdviceTooltipComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdviceTooltipComponent],
      imports: [MatIconModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AdviceTooltipComponent);
    component = fixture.componentInstance;
  });

  it('renders the warning presentation by default', () => {
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.advice-card') as HTMLElement;
    const icon = fixture.nativeElement.querySelector('.advice-card__icon') as HTMLElement;

    expect(card.getAttribute('data-tone')).toBe('warning');
    expect(icon.textContent?.trim()).toBe('lightbulb');
  });

  it('renders custom title, tone, and icon values', () => {
    component.title = 'Heads up';
    component.tone = 'info';
    component.icon = 'campaign';
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.advice-card') as HTMLElement;
    const title = fixture.nativeElement.querySelector('.advice-card__title') as HTMLElement;
    const icon = fixture.nativeElement.querySelector('.advice-card__icon') as HTMLElement;

    expect(card.getAttribute('data-tone')).toBe('info');
    expect(title.textContent?.trim()).toBe('Heads up');
    expect(icon.textContent?.trim()).toBe('campaign');
  });
});

describe('AdviceTooltipComponent - iconName getter', () => {
  function make(): AdviceTooltipComponent {
    return Object.assign(new AdviceTooltipComponent(), {});
  }

  it('returns custom icon when set', () => {
    const c = make(); c.icon = 'star'; expect(c.iconName).toBe('star');
  });
  it('returns lightbulb for warning tone', () => {
    const c = make(); c.tone = 'warning'; expect(c.iconName).toBe('lightbulb');
  });
  it('returns info for info tone', () => {
    const c = make(); c.tone = 'info'; expect(c.iconName).toBe('info');
  });
  it('returns warning for danger tone', () => {
    const c = make(); c.tone = 'danger'; expect(c.iconName).toBe('warning');
  });
  it('returns check_circle for success tone', () => {
    const c = make(); c.tone = 'success'; expect(c.iconName).toBe('check_circle');
  });
});