import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { buildMarketplaceCardViewModel } from 'src/app/features/marketplace/marketplace-view-models';
import {
  createMarketplaceListing,
  createMarketplaceModule
} from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import { MarketplaceListingCardComponent } from './marketplace-listing-card.component';

describe('MarketplaceListingCardComponent', () => {
  let fixture: ComponentFixture<MarketplaceListingCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MarketplaceListingCardComponent,
        RouterTestingModule
      ],
      providers: [provideNoopAnimations()]
    });
    fixture = TestBed.createComponent(MarketplaceListingCardComponent);
    fixture.componentInstance.listing = buildMarketplaceCardViewModel(createMarketplaceListing(), new Date('2026-07-17T12:00:00.000Z'));
    fixture.detectChanges();
  });

  it('renders a keyboard-focusable listing link with public card facts', () => {
    const host = fixture.nativeElement as HTMLElement;
    const link = host.querySelector<HTMLAnchorElement>('[data-testid="marketplace-card"]');

    expect(link?.getAttribute('href')).toBe('/marketplace/maths-public');
    expect(link?.getAttribute('aria-label')).toContain('Open listing for Maths');
    expect(host.textContent).toContain('Make Noise');
    expect(host.textContent).toContain('Excellent');
    expect(host.textContent).toContain('Offers open');
    expect(host.querySelector('.marketplace-card__price')?.textContent?.trim()).toBeTruthy();
  });

  it('renders the canonical module faceplate when the listing has no uploaded image', () => {
    fixture.componentRef.setInput('listing', buildMarketplaceCardViewModel(createMarketplaceListing({media: []})));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="marketplace-card-module-image"]')).not.toBeNull();
    expect(host.querySelector('app-module-part-image')).not.toBeNull();
    expect(host.querySelector('.marketplace-card__placeholder')).toBeNull();
  });

  it('renders the monogram only when listing media and module panels are unavailable', () => {
    fixture.componentRef.setInput('listing', buildMarketplaceCardViewModel(createMarketplaceListing({
      media: [],
      module: createMarketplaceModule({panels: []})
    })));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.marketplace-card__placeholder')).not.toBeNull();
    expect(host.querySelector('img')).toBeNull();
  });
});
