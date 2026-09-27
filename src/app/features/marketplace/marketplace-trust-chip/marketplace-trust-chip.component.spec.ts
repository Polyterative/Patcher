import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { summarizeMarketplaceTrustBand } from 'src/app/features/marketplace/marketplace-feedback.utils';
import { MarketplaceTrustChipComponent } from './marketplace-trust-chip.component';

describe('MarketplaceTrustChipComponent', () => {
  let fixture: ComponentFixture<MarketplaceTrustChipComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MarketplaceTrustChipComponent],
      providers: [provideNoopAnimations()]
    });
    fixture = TestBed.createComponent(MarketplaceTrustChipComponent);
    fixture.detectChanges();
  });

  it('renders nothing without a trust summary', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="marketplace-trust-chip"]')).toBeNull();
  });

  it('renders the new-seller band without shaming new accounts', () => {
    fixture.componentRef.setInput('summary', summarizeMarketplaceTrustBand({
      completedTransactions: 0,
      negativeFeedbackCount: 0,
      positiveFeedbackCount: 0
    }));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const chip = host.querySelector('[data-testid="marketplace-trust-chip"]');

    expect(chip?.textContent).toContain('New seller');
    expect(chip?.querySelector('mat-icon')?.textContent).toContain('fiber_new');
    expect(fixture.debugElement.query(By.directive(MatTooltip))?.injector.get(MatTooltip).message)
      .toContain('Not enough closed marketplace history');
  });

  it('renders steady and mixed bands with methodology tooltips', () => {
    fixture.componentRef.setInput('summary', summarizeMarketplaceTrustBand({
      completedTransactions: 5,
      negativeFeedbackCount: 0,
      positiveFeedbackCount: 4
    }));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="marketplace-trust-chip"]')?.textContent).toContain('Steady seller');

    fixture.componentRef.setInput('summary', summarizeMarketplaceTrustBand({
      completedTransactions: 6,
      negativeFeedbackCount: 3,
      positiveFeedbackCount: 2
    }));
    fixture.detectChanges();

    const steadyHost = fixture.nativeElement as HTMLElement;
    expect(steadyHost.querySelector('[data-testid="marketplace-trust-chip"]')?.textContent).toContain('Mixed feedback');
  });
});
