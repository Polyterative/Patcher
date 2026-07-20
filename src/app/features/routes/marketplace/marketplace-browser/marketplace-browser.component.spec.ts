import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { createMarketplaceListing } from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import { MarketplaceBrowserComponent } from './marketplace-browser.component';

describe('MarketplaceBrowserComponent', () => {
  let fixture: ComponentFixture<MarketplaceBrowserComponent>;
  let backend: jasmine.SpyObj<SupabaseService>;
  let loggedUser$: BehaviorSubject<{id: string} | null>;

  beforeEach(() => {
    loggedUser$ = new BehaviorSubject<{id: string} | null>(null);
    backend = {
      GET: {
        activeMarketplaceListings: jasmine.createSpy('activeMarketplaceListings').and.returnValue(of(
          Array.from({length: 24}, (_, index) => createMarketplaceListing({
            id: `listing-${index}`,
            publicId: `maths-public-${index}`
          }))
        ))
      }
    } as unknown as jasmine.SpyObj<SupabaseService>;

    TestBed.configureTestingModule({
      imports: [
        MarketplaceBrowserComponent,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        {provide: SupabaseService, useValue: backend},
        {provide: MatSnackBar, useValue: {open: jasmine.createSpy('open')}},
        {provide: UserManagementService, useValue: {loggedUser$}}
      ]
    });
    fixture = TestBed.createComponent(MarketplaceBrowserComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('renders the approved browse layout classes and public listing grid', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.sidebar-layout')).not.toBeNull();
    expect(host.querySelector('.filter-sidebar')).not.toBeNull();
    expect(host.querySelector('.browser-content-area')).not.toBeNull();
    expect(host.querySelector('[data-testid="marketplace-grid"]')).not.toBeNull();
    expect(host.textContent).toContain('Marketplace');
    expect(host.textContent).toContain('Maths');
  });

  it('exposes mobile filter disclosure and active filter chips', () => {
    const component = fixture.componentInstance;
    component.toggleMobileFilters();
    component.updateFilter('manufacturer', 'Make Noise');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const toggle = host.querySelector<HTMLButtonElement>('.marketplace-filter-toggle');

    expect(toggle?.getAttribute('aria-controls')).toBe('marketplace-filter-advanced-controls');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('.marketplace-filter-rail--expanded')).not.toBeNull();
    expect(host.querySelector('[data-testid="marketplace-active-chips"]')?.textContent).toContain('Make Noise');
  });

  it('shows currency selection before enabling price filters', () => {
    const host = fixture.nativeElement as HTMLElement;
    const priceInputs = () => host.querySelectorAll<HTMLInputElement>('input[type="number"]');

    expect(host.textContent).toContain('Select a currency to enable price range and price sorting.');
    expect(priceInputs()[0].disabled).toBeTrue();
    expect(priceInputs()[1].disabled).toBeTrue();

    fixture.componentInstance.updateFilter('currency', 'EUR');
    fixture.detectChanges();

    expect(priceInputs()[0].disabled).toBeFalse();
    expect(priceInputs()[1].disabled).toBeFalse();
    expect(host.querySelector('[data-testid="marketplace-active-chips"]')?.textContent).toContain('Currency: EUR');

    fixture.componentInstance.clearFilter('currency');
    fixture.detectChanges();

    expect(host.textContent).toContain('Select a currency to enable price range and price sorting.');
    expect(priceInputs()[0].disabled).toBeTrue();
    expect(priceInputs()[1].disabled).toBeTrue();
  });

  it('preserves the browse return URL when login is required', () => {
    const host = fixture.nativeElement as HTMLElement;
    const loginLink = host.querySelector<HTMLAnchorElement>('.marketplace-browser__login-fab');

    expect(loginLink?.getAttribute('href')).toBe('/auth/login?returnUrl=%2Fmarketplace');
  });

  it('hides the login action for authenticated users', () => {
    loggedUser$.next({id: 'user-1'});
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.marketplace-browser__login-fab')).toBeNull();
  });

  it('keeps load more available when current filters match none of the loaded page', () => {
    fixture.componentInstance.updateFilter('manufacturer', 'No loaded manufacturer');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="marketplace-empty"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="marketplace-load-more"]')).not.toBeNull();
  });
});
