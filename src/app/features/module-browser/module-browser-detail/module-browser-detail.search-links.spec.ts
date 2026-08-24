import { MODULE_SEARCH_LINKS } from './module-browser-detail.constants';
import {
  ModuleBrowserDetailComponent
} from './module-browser-detail.component';
import {
  getAvailableRetailerSearchLinks,
  getManufacturerSearchLinks
} from './module-browser-detail.search-links';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries.models';


describe('ModuleBrowserDetailComponent search links', () => {
  type ModuleBrowserDetailSearchLinkContract = Pick<
    ModuleBrowserDetailComponent,
    'searchLinks' | 'communitySearchLinks' | 'retailerSearchLinks' | 'getAvailableRetailerSearchLinks'
  >;

  function buildListing(
    storeSlug: string,
    storeId = 1,
    verificationStatus: ModulePriceListing['verificationStatus'] = 'verified'
  ): ModulePriceListing {
    return {
      listingId: storeId,
      moduleId: 99,
      storeId,
      storeSlug,
      storeName: storeSlug,
      countryCode: null,
      currencyHint: null,
      productUrl: 'https://example.com/product',
      verificationStatus,
      lastCheckedAt: null,
      latestSnapshot: null
    };
  }

  function build() {
    const component: ModuleBrowserDetailSearchLinkContract = {
      searchLinks: MODULE_SEARCH_LINKS,
      communitySearchLinks: MODULE_SEARCH_LINKS.filter(link => link.kind === 'community'),
      retailerSearchLinks: retailerSearchLinks(),
      getAvailableRetailerSearchLinks(listings) {
        return getAvailableRetailerSearchLinks(this.retailerSearchLinks, listings);
      }
    };
    return {component};
  }

  function retailerSearchLinks() {
    return MODULE_SEARCH_LINKS.filter(link => link.kind === 'retailer');
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
    const labels = getAvailableRetailerSearchLinks(retailerSearchLinks(), [buildListing('control')])
      .map(link => link.label);

    expect(labels).not.toContain('Control 🇺🇸');
    expect(labels).toContain('Patchwerks 🇺🇸');
  });

  it('keeps retailer search links visible for non-verified price listings', () => {
    const labels = getAvailableRetailerSearchLinks(retailerSearchLinks(), [
      buildListing('control', 1, 'candidate'),
      buildListing('found-sound', 2, 'stale')
    ]).map(link => link.label);

    expect(labels).toContain('Control 🇺🇸');
    expect(labels).toContain('Found Sound 🇦🇺');
  });

  it('keeps Signal Sounds UK and EU retailer suppression independent', () => {
    const labels = getAvailableRetailerSearchLinks(retailerSearchLinks(), [buildListing('signal-sounds-eu', 2)])
      .map(link => link.label);

    expect(labels).toContain('Signal Sounds UK 🇬🇧');
    expect(labels).not.toContain('Signal Sounds EU 🇪🇺');
  });

  it('includes the imported and fallback retailer search links', () => {
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
      'Detroit Modular 🇺🇸',
      'Nightlife Electronics 🇨🇦',
      'Clockface Modular 🇯🇵',
      'Moog Audio 🇨🇦',
      'Noisebug 🇺🇸',
      'Pusherman Productions 🇬🇧',
      'Thonk 🇬🇧',
      'Patch Point 🇩🇪',
      'RobotSpeak 🇺🇸',
      'Cicada Sound 🇨🇦',
      'Soundium 🇱🇹',
    ].forEach(label => expect(labels).toContain(label));
  });

  it('excludes manufacturer-owned store links from the retailer group', () => {
    const {component} = build();
    const labels = component.retailerSearchLinks.map(link => link.label);

    [
      'After Later Audio 🇺🇸',
      'ALM / Busy Circuits 🇬🇧',
      'Instruo 🇬🇧',
      'WMD 🇺🇸',
      'Michigan Synth Works 🇺🇸',
      'Intellijel 🇨🇦',
      'Schlappi Engineering 🇺🇸',
      'Zlob Modular 🇺🇸',
      'Nano Modules 🇪🇸',
      'Dreadbox 🇬🇷',
    ].forEach(label => expect(labels).not.toContain(label));
  });

  it('can suppress every retailer link so the Other Stores group can disappear', () => {
    const links = retailerSearchLinks();
    const listings = links.map((link, index) => buildListing(link.storeSlugs![0], index + 1));

    expect(getAvailableRetailerSearchLinks(links, listings)).toEqual([]);
  });

  describe('getManufacturerSearchLinks', () => {
    function manufacturerSearchLinks() {
      return MODULE_SEARCH_LINKS.filter(link => link.kind === 'manufacturer');
    }

    it('returns only the link(s) whose manufacturerIds includes the given manufacturerId', () => {
      const links = manufacturerSearchLinks();

      const result = getManufacturerSearchLinks(links, 1048);

      expect(result.length).toBe(1);
      expect(result[0].label).toBe('Nano Modules 🇪🇸');
    });

    it('does not return the Nano Modules link when passed a different manufacturer\'s id (Intellijel)', () => {
      const links = manufacturerSearchLinks();

      const result = getManufacturerSearchLinks(links, 999);
      const labels = result.map(link => link.label);

      expect(labels).not.toContain('Nano Modules 🇪🇸');
      expect(labels).toContain('Intellijel 🇨🇦');
    });

    it('returns [] when manufacturerId matches no manufacturerIds entry, and [] for null/undefined', () => {
      const links = manufacturerSearchLinks();

      expect(getManufacturerSearchLinks(links, 424242)).toEqual([]);
      expect(getManufacturerSearchLinks(links, null)).toEqual([]);
      expect(getManufacturerSearchLinks(links, undefined)).toEqual([]);
    });

    it('reclassifies exactly the expected 10 stores as manufacturer-owned', () => {
      const links = manufacturerSearchLinks();
      const byLabel = new Map(links.map(link => [link.label, link]));

      expect(byLabel.get('Nano Modules 🇪🇸')?.manufacturerIds).toEqual([1048]);
      expect(byLabel.get('Intellijel 🇨🇦')?.manufacturerIds).toEqual([999]);
      expect(byLabel.get('Dreadbox 🇬🇷')?.manufacturerIds).toEqual([951]);
      expect(byLabel.get('WMD 🇺🇸')?.manufacturerIds).toEqual([1169]);
      expect(byLabel.get('Instruo 🇬🇧')?.manufacturerIds).toEqual([997]);
      expect(byLabel.get('ALM / Busy Circuits 🇬🇧')?.manufacturerIds).toEqual([898]);
      expect(byLabel.get('Schlappi Engineering 🇺🇸')?.manufacturerIds).toEqual([1104]);
      expect(byLabel.get('Zlob Modular 🇺🇸')?.manufacturerIds).toEqual([1177]);
      expect(byLabel.get('Michigan Synth Works 🇺🇸')?.manufacturerIds).toEqual([1037]);
      expect(byLabel.get('After Later Audio 🇺🇸')?.manufacturerIds).toEqual([894]);
      expect(links.length).toBe(10);
    });
  });
});