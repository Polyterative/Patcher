import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { ModuleBrowserDetailComponent } from './module-browser-detail.component';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries.models';


describe('ModuleBrowserDetailComponent search links', () => {
  function buildListing(storeSlug: string, storeId = 1): ModulePriceListing {
    return {
      listingId: storeId,
      moduleId: 99,
      storeId,
      storeSlug,
      storeName: storeSlug,
      countryCode: null,
      currencyHint: null,
      productUrl: 'https://example.com/product',
      verificationStatus: 'verified',
      lastCheckedAt: null,
      latestSnapshot: null
    };
  }

  function build() {
    const routeParams$ = new Subject<any>();
    const component = new ModuleBrowserDetailComponent(
      {
        singleModuleData$: new BehaviorSubject<any>(undefined),
        modulePriceListings$: new BehaviorSubject<ModulePriceListing[] | undefined>(undefined),
        updateSingleModuleData$: new Subject<number>(),
        changeModule$: new Subject<any>(),
        requestModuleEditingToggle$: new Subject<void>()
      } as any,
      {params: routeParams$.asObservable()} as any,
      jasmine.createSpyObj('Router', ['navigate']),
      {updateSeo: jasmine.createSpy('updateSeo')} as any,
      {} as any,
      {requestCommentsUpdate$: {next: jasmine.createSpy('comments.next')}, requestReset$: {next: jasmine.createSpy('reset.next')}} as any,
      {} as any
    );
    return {component};
  }
  
  it('builds URLs for every configured search link', () => {
    const {component} = build();
    const urls = component.searchLinks.map(link => link.url('Maths', 'Make Noise'));
    
    expect(urls.length).toBe(component.searchLinks.length);
    urls.forEach(url => expect(url).toContain('Maths'));
    expect(urls.some(url => url.includes('youtube.com'))).toBeTrue();
    expect(urls.some(url => url.includes('modulargrid.net'))).toBeTrue();
    expect(urls.some(url => url.includes('perfectcircuit.com'))).toBeTrue();
  });

  it('includes manufacturer name in Google and YouTube URLs', () => {
    const {component} = build();
    const google = component.searchLinks.find(l => l.label === 'Google');
    const youtube = component.searchLinks.find(l => l.label === 'YouTube');

    expect(google).toBeTruthy();
    expect(google!.url('Rings', 'Mutable Instruments')).toContain('Mutable');
    expect(youtube).toBeTruthy();
    expect(youtube!.url('Rings', 'Mutable Instruments')).toContain('Mutable');
  });

  it('encodes user input in search URLs', () => {
    const {component} = build();
    const google = component.searchLinks.find(l => l.label === 'Google');

    expect(google).toBeTruthy();
    const url = new URL(google!.url('Rings & Co', 'Mutable Instruments/Inc?'));
    expect(url.searchParams.get('q')).toBe('Rings & Co by Mutable Instruments/Inc?');
  });

  it('every search link has a non-empty label and icon', () => {
    const {component} = build();
    component.searchLinks.forEach(link => {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.icon.length).toBeGreaterThan(0);
    });
  });

  it('has at least 4 search links configured', () => {
    const {component} = build();
    expect(component.searchLinks.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps community/reference links in their own always-visible group', () => {
    const {component} = build();
    const communityLabels = component.communitySearchLinks.map(link => link.label);

    expect(communityLabels).toContain('Google');
    expect(communityLabels).toContain('YouTube');
    expect(communityLabels).toContain('Wigglehunt');
    expect(component.communitySearchLinks.every(link => link.kind === 'community')).toBeTrue();
  });

  it('does not suppress retailer links before price listings resolve', () => {
    const {component} = build();

    expect(component.getAvailableRetailerSearchLinks(undefined)).toEqual(component.retailerSearchLinks);
  });

  it('hides retailer search links with matching price listings and leaves unmatched retailers visible', () => {
    const {component} = build();
    const labels = component.getAvailableRetailerSearchLinks([buildListing('control')]).map(link => link.label);

    expect(labels).not.toContain('Control 🇺🇸');
    expect(labels).toContain('Patchwerks 🇺🇸');
  });

  it('keeps Signal Sounds UK and EU retailer suppression independent', () => {
    const {component} = build();
    const labels = component.getAvailableRetailerSearchLinks([buildListing('signal-sounds-eu', 2)]).map(link => link.label);

    expect(labels).toContain('Signal Sounds UK 🇬🇧');
    expect(labels).not.toContain('Signal Sounds EU 🇪🇺');
  });

  it('includes the pictured EU, UK, and Switzerland retailer links', () => {
    const {component} = build();
    const labels = component.retailerSearchLinks.map(link => link.label);

    [
      'Milk Audio Store 🇮🇹',
      'Modular Square 🇫🇷',
      'MIDI Amsterdam 🇳🇱',
      'Modularsynthesizers.nl 🇳🇱',
      'Escape From Noise 🇸🇪',
      'Elevator Sound 🇬🇧',
      'Signal Sounds EU 🇪🇺',
      'Triangle Core Rocks 🇩🇪',
      'Post Modular 🇬🇧',
      'Rubadub 🇬🇧',
      'Signal Sounds UK 🇬🇧',
      'Machineroom 🇺🇦',
      'Synthshop 🇳🇴',
      'House of Sound 🇨🇭',
    ].forEach(label => expect(labels).toContain(label));
  });

  it('can suppress every retailer link so the Other Stores group can disappear', () => {
    const {component} = build();
    const listings = component.retailerSearchLinks.map((link, index) => buildListing(link.storeSlugs![0], index + 1));

    expect(component.getAvailableRetailerSearchLinks(listings)).toEqual([]);
  });
});