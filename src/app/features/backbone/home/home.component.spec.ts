import type { SeoSocialShareData } from 'src/app/models/seo.model';
import type { SeoAndUtilsService } from '../seo-and-utils.service';
import type { HomeDataService } from './home-data.service';
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

  it('registers homepage SEO that names the ModularGrid import', () => {
    expect(mockSeoSvc.updateSeo).toHaveBeenCalledTimes(1);
    const [seo, page] = mockSeoSvc.updateSeo.calls.mostRecent().args as [SeoSocialShareData, string];
    expect(page).toBe('Home');
    expect(seo.url).toBe('https://patcher.xyz/');
    expect(seo.description).toContain('ModularGrid');
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
