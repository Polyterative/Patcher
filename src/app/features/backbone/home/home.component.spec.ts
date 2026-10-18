import type { SeoSocialShareData } from 'src/app/models/seo.model';
import type { SeoAndUtilsService } from '../seo-and-utils.service';
import type { HomeDataService } from './home-data.service';
import { environment } from 'src/environments/environment';
import { HOME_HERO, HOME_TOUR_TABS } from './home-copy';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let comp: HomeComponent;
  let mockSeoSvc: jasmine.SpyObj<SeoAndUtilsService>;
  let scrollIntoView: jasmine.Spy;
  let fakeDocument: Document;

  function makeComponent(platformId: 'browser' | 'server') {
    return new HomeComponent(
      {} as HomeDataService,
      mockSeoSvc,
      fakeDocument,
      platformId as unknown as object,
    );
  }

  beforeEach(() => {
    mockSeoSvc = jasmine.createSpyObj<SeoAndUtilsService>('SeoAndUtilsService', ['updateSeo']);
    scrollIntoView = jasmine.createSpy('scrollIntoView');
    fakeDocument = {
      defaultView: {matchMedia: () => ({matches: false})},
      getElementById: (id: string) => (id === 'switch' ? {scrollIntoView} : null)
    } as unknown as Document;

    comp = makeComponent('browser');
  });

  it('omits ModularGrid from the SEO description when the import flag is off', () => {
    const previous = environment.features.modularGridImportEnabled;
    environment.features.modularGridImportEnabled = false;
    try {
      makeComponent('browser');
    } finally {
      environment.features.modularGridImportEnabled = previous;
    }
    const [seo] = mockSeoSvc.updateSeo.calls.mostRecent().args as [SeoSocialShareData, string];
    expect(seo.description?.toLowerCase()).not.toContain('modulargrid');
    expect(seo.description).toContain('document patches and build on the public API.');
  });

  it('registers homepage SEO that names the ModularGrid import without using the name as a keyword', () => {
    const previous = environment.features.modularGridImportEnabled;
    environment.features.modularGridImportEnabled = true;
    try {
      mockSeoSvc.updateSeo.calls.reset();
      makeComponent('browser');
    } finally {
      environment.features.modularGridImportEnabled = previous;
    }
    expect(mockSeoSvc.updateSeo).toHaveBeenCalledTimes(1);
    const [seo, page] = mockSeoSvc.updateSeo.calls.mostRecent().args as [SeoSocialShareData, string];
    expect(page).toBe('Home');
    expect(seo.url).toBe('https://patcher.xyz/');
    expect(seo.description).toContain('import racks from ModularGrid');
    expect(seo.keywords?.toLowerCase()).not.toContain('modulargrid');
  });

  it('keeps the owner-approved headline', () => {
    expect(comp.hero.title).toBe(HOME_HERO.title);
    expect(comp.hero.title).toMatch(/operating system.*modular/i);
  });

  it('tours the three core surfaces in order', () => {
    expect(comp.tourTabs.map(tab => tab.id)).toEqual(['library', 'racks', 'patches']);
    expect(comp.tourTabs).toBe(HOME_TOUR_TABS);
  });

  it('scrolls to the switch section in the browser', () => {
    comp.scrollToSwitch();
    expect(scrollIntoView).toHaveBeenCalledWith({behavior: 'smooth', block: 'start'});
  });

  it('does not touch the DOM during SSR', () => {
    const serverComp = makeComponent('server');
    serverComp.scrollToSwitch();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
