import { BehaviorSubject, Subject } from 'rxjs';
import { ApplicationInsightsPageComponent } from './application-insights-page.component';
import { ApplicationDiscoverySnapshot } from '../../backbone/home/application-statistics.models';
import { ApplicationStatisticsService } from '../../backbone/home/application-statistics.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';

interface InsightsStatsMock {
  page$: Subject<Record<string, unknown>>;
  discovery$: Subject<Record<string, unknown>>;
  heroBucket$: BehaviorSubject<string>;
  refresh: jasmine.Spy;
  selectHeroBucket: jasmine.Spy;
  trackHeroModuleClicked: jasmine.Spy;
  trackSupportLinkClicked: jasmine.Spy;
}

function mockStatistics(): InsightsStatsMock {
  return {
    page$: new Subject<Record<string, unknown>>(),
    discovery$: new Subject<Record<string, unknown>>(),
    heroBucket$: new BehaviorSubject<string>('mostOwned'),
    refresh: jasmine.createSpy('refresh'),
    selectHeroBucket: jasmine.createSpy('selectHeroBucket'),
    trackHeroModuleClicked: jasmine.createSpy('trackHeroModuleClicked'),
    trackSupportLinkClicked: jasmine.createSpy('trackSupportLinkClicked')
  };
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

function buildPageStub(): Record<string, unknown> {
  return {
    activityChart: {
      days: [
        {date: '2026-05-03', label: 'May 3', showLabel: true, total: 2, heightPercent: 50, modules: 2, racks: 0, patches: 0}
      ],
      legend: [
        {label: 'Modules', valueLabel: '2', toneClass: 'modules'}
      ],
      momentum: [],
      highlights: []
    },
    footprintSnapshot: [],
    activeManufacturerBars: []
  };
}

function buildDiscoveryStub(): ApplicationDiscoverySnapshot {
  return {
    mostOwned: [
      {id: 5, name: 'Maths', manufacturer: {id: 2, name: 'Make Noise'}, count: 41}
    ],
    mostWanted: [],
    mostSold: []
  };
}

function buildEmptyDiscoveryStub(): ApplicationDiscoverySnapshot {
  return {
    mostOwned: [],
    mostWanted: [],
    mostSold: []
  };
}

describe('ApplicationInsightsPageComponent', () => {
  let stats: InsightsStatsMock;
  let seo: SeoAndUtilsService;
  let comp: ApplicationInsightsPageComponent;

  function build(): ApplicationInsightsPageComponent {
    return new ApplicationInsightsPageComponent(
      stats as unknown as ApplicationStatisticsService,
      seo
    );
  }

  beforeEach(() => {
    stats = mockStatistics();
    seo = mockSeo();
    comp = build();
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('calls updateSeo with title "Application insights"', () => {
      expect(seo.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({ title: 'Application insights' }),
        'Application insights'
      );
    });

    it('vm$ is defined', () => {
      expect(comp.vm$).toBeDefined();
    });

    it('exposes the three ownership buckets', () => {
      expect(comp.heroBuckets.map((bucket) => bucket.key)).toEqual(['mostOwned', 'mostWanted', 'mostSold']);
    });
  });

  describe('vm$ stream', () => {
    it('emits isLoading=true as first value (from startWith)', (done) => {
      comp.vm$.subscribe((vm) => {
        expect(vm.isLoading).toBeTrue();
        expect(vm.page).toBeNull();
        expect(vm.discovery).toBeNull();
        done();
      });
    });

    it('emits a loaded vm combining page, discovery, and the selected bucket', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.isLoading).toBeFalse();
          expect(vm.pageError).toBeFalse();
          expect(vm.discoveryError).toBeFalse();
          expect(vm.bucket).toBe('mostOwned');
          expect(vm.heroEmpty).toBeFalse();
          expect(vm.heroEntries.map((entry) => entry.id)).toEqual([5]);
          expect(vm.updatedLabel).toBe('May 3');
          expect(vm.activityChips).toEqual([
            {label: 'Modules (last 30 days)', value: '2', icon: 'view_module'}
          ]);
          done();
        }
      });
      stats.page$.next(buildPageStub());
      stats.discovery$.next(buildDiscoveryStub() as unknown as Record<string, unknown>);
    });

    it('suppresses empty buckets client-side with heroEmpty', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.heroEmpty).toBeTrue();
          expect(vm.heroEntries).toEqual([]);
          done();
        }
      });
      stats.page$.next(buildPageStub());
      stats.discovery$.next(buildEmptyDiscoveryStub() as unknown as Record<string, unknown>);
    });

    it('surfaces page errors and retries through the data service', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.pageError).toBeTrue();
          expect(vm.page).toBeNull();
          comp.retry();
          expect(stats.refresh).toHaveBeenCalled();
          done();
        }
      });
      stats.discovery$.next(buildDiscoveryStub() as unknown as Record<string, unknown>);
      stats.page$.error(new Error('snapshot failed'));
    });

    it('surfaces discovery errors while keeping page content', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.discoveryError).toBeTrue();
          expect(vm.heroEmpty).toBeTrue();
          expect(vm.page).not.toBeNull();
          done();
        }
      });
      stats.page$.next(buildPageStub());
      stats.discovery$.error(new Error('discovery failed'));
    });

    it('passes the derived racks takeaway through to the template vm', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          const page = vm.page as unknown as {privateFootprint: {racksTakeaway: string}};
          expect(page.privateFootprint.racksTakeaway).toContain('racks');
          done();
        }
      });
      stats.page$.next({
        ...buildPageStub(),
        privateFootprint: {
          suppressed: false,
          slices: [],
          racksTakeaway: 'Most racks are shared publicly, with the remaining private share included in the totals.'
        }
      });
      stats.discovery$.next(buildDiscoveryStub() as unknown as Record<string, unknown>);
    });

    it('derives the hero takeaway for the selected bucket', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.heroTakeaway).toBe('A single module tops the ranking.');
          done();
        }
      });
      stats.page$.next(buildPageStub());
      stats.discovery$.next(buildDiscoveryStub() as unknown as Record<string, unknown>);
    });

    it('falls back to the generic hero takeaway for an empty bucket', (done) => {
      let count = 0;
      comp.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.heroEmpty).toBeTrue();
          expect(vm.heroTakeaway).toBe('Rankings appear once community counts reach the reporting threshold.');
          done();
        }
      });
      stats.page$.next(buildPageStub());
      stats.discovery$.next(buildEmptyDiscoveryStub() as unknown as Record<string, unknown>);
    });
  });

  describe('hero interactions', () => {
    it('delegates bucket selection to the data service', () => {
      comp.onHeroBucket('mostWanted');
      expect(stats.selectHeroBucket).toHaveBeenCalledWith('mostWanted');
    });

    it('delegates hero module clicks with bucket, entry, and rank', () => {
      const entry = buildDiscoveryStub().mostOwned[0];
      comp.onHeroModuleClick('mostOwned', entry, 1);
      expect(stats.trackHeroModuleClicked).toHaveBeenCalledWith('mostOwned', entry, 1);
    });

    it('delegates support link clicks with the link target', () => {
      comp.onSupportLinkClick('fresh_browse_racks');
      expect(stats.trackSupportLinkClicked).toHaveBeenCalledWith('fresh_browse_racks');
    });

    it('labels bucket count nouns for hero rows', () => {
      expect(comp.heroCountNoun('mostOwned')).toBe('in racks');
      expect(comp.heroCountNoun('mostWanted')).toBe('wishes');
      expect(comp.heroCountNoun('mostSold')).toBe('sales');
      expect(comp.heroBucketLabel('mostSold')).toBe('Changing hands');
      expect(comp.heroBucketLabel('mostOwned')).toBe('Loved right now');
      expect(comp.heroBucketLabel('mostWanted')).toBe('On wishlists');
    });

    it('reuses a read-only module-minimal card config for hero rankings', () => {
      expect(comp.heroModuleViewConfig.hideButtons).toBeTrue();
      expect(comp.heroModuleViewConfig.hideDates).toBeTrue();
      expect(comp.heroModuleViewConfig.hideDescription).toBeTrue();
      expect(comp.heroModuleViewConfig.hideTags).toBeTrue();
      expect(comp.heroModuleViewConfig.hideHP).toBeTrue();
      expect(comp.heroModuleViewConfig.hideIoCounts).toBeTrue();
      expect(comp.heroModuleViewConfig.hideManufacturer).toBeFalse();
    });
  });
});
