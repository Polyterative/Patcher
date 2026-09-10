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
  trackDiscoveryRailClicked: jasmine.Spy;
  trackMethodDetailsOpened: jasmine.Spy;
}

function mockStatistics(): InsightsStatsMock {
  return {
    page$: new Subject<Record<string, unknown>>(),
    discovery$: new Subject<Record<string, unknown>>(),
    heroBucket$: new BehaviorSubject<string>('mostOwned'),
    refresh: jasmine.createSpy('refresh'),
    selectHeroBucket: jasmine.createSpy('selectHeroBucket'),
    trackHeroModuleClicked: jasmine.createSpy('trackHeroModuleClicked'),
    trackSupportLinkClicked: jasmine.createSpy('trackSupportLinkClicked'),
    trackDiscoveryRailClicked: jasmine.createSpy('trackDiscoveryRailClicked'),
    trackMethodDetailsOpened: jasmine.createSpy('trackMethodDetailsOpened')
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
    topManufacturerBars: [
      {label: 'Make Noise', valueLabel: '120', detail: '120 public modules', widthPercent: 100, tone: 'brand'}
    ],
    activeManufacturerBars: [
      {label: 'Intellijel', valueLabel: '14', detail: '14 modules updated in the last 30 days', widthPercent: 100, tone: 'emerald'}
    ],
    makersTakeaway: 'Recent maker updates are spread across makers with no single maker pulling ahead.',
    standardMixBars: [
      {label: '3U', valueLabel: '1,000', detail: '1000 public modules in this format', widthPercent: 100, tone: 'brand'}
    ],
    hpBandBars: [
      {label: '0-2 HP', valueLabel: '60', detail: '60 modules in this size band', widthPercent: 12, tone: 'brand'},
      {label: '3-5 HP', valueLabel: '110', detail: '110 modules in this size band', widthPercent: 22, tone: 'emerald'},
      {label: '6-8 HP', valueLabel: '170', detail: '170 modules in this size band', widthPercent: 33, tone: 'violet'},
      {label: '9-16 HP', valueLabel: '510', detail: '510 modules in this size band', widthPercent: 100, tone: 'amber'},
      {label: '17-28 HP', valueLabel: '320', detail: '320 modules in this size band', widthPercent: 63, tone: 'brand'},
      {label: '29+ HP', valueLabel: '110', detail: '110 modules in this size band', widthPercent: 22, tone: 'emerald'}
    ],
    hpBandHighlights: [
      {label: 'Median width', value: '12 HP', icon: 'straighten'}
    ],
    moduleFreshnessBars: [
      {label: 'Fresh (0-7 days)', valueLabel: '25', detail: '25 public modules moved in the last week', widthPercent: 100, tone: 'brand'},
      {label: 'Recent (8-30 days)', valueLabel: '40', detail: '40 public modules moved earlier this month', widthPercent: 80, tone: 'emerald'}
    ],
    sharingMix: [
      {label: 'Racks', valueLabel: '84 (65%)', widthPercent: 65, tone: 'emerald'},
      {label: 'Patches', valueLabel: '42 (35%)', widthPercent: 35, tone: 'brand'}
    ]
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

    it('calls updateSeo with the discovery title and description', () => {
      expect(seo.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Discover modules',
          description: 'What the community loves, wishes for, and trades — plus makers, formats, and fresh activity.',
          url: 'https://patcher.xyz/insights'
        }),
        'Discover modules'
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

    it('delegates discovery rail clicks with the rail target', () => {
      comp.onDiscoveryRailClick('makers');
      expect(stats.trackDiscoveryRailClicked).toHaveBeenCalledWith('makers');
    });

    it('tracks method-details opens only when the details element opens', () => {
      comp.onMethodDetailsToggle({target: {open: true}} as unknown as Event);
      expect(stats.trackMethodDetailsOpened).toHaveBeenCalledTimes(1);
      comp.onMethodDetailsToggle({target: {open: false}} as unknown as Event);
      expect(stats.trackMethodDetailsOpened).toHaveBeenCalledTimes(1);
    });

    it('labels bucket count nouns for hero rows', () => {      expect(comp.heroCountNoun('mostOwned')).toBe('in racks');
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

  describe('discovery rails', () => {
    it('condenses six HP bands into Tiny/Classic/Big buckets with summed counts', () => {
      const buckets = comp.sizeGuideBuckets((buildPageStub()['hpBandBars'] as unknown) as Parameters<ApplicationInsightsPageComponent['sizeGuideBuckets']>[0]);
      expect(buckets.map((bucket) => bucket.label)).toEqual(['Tiny (0–5 HP)', 'Classic (6–16 HP)', 'Big (17+ HP)']);
      expect(buckets.map((bucket) => bucket.valueLabel)).toEqual(['170', '680', '430']);
      expect(buckets[1].widthPercent).toBe(100);
    });

    it('falls back to positional splits when HP labels differ', () => {
      const bars = [
        {label: 'XS', valueLabel: '10', detail: '', widthPercent: 10, tone: 'brand'},
        {label: 'S', valueLabel: '20', detail: '', widthPercent: 20, tone: 'brand'},
        {label: 'M', valueLabel: '30', detail: '', widthPercent: 30, tone: 'brand'},
        {label: 'L', valueLabel: '40', detail: '', widthPercent: 40, tone: 'brand'},
        {label: 'XL', valueLabel: '50', detail: '', widthPercent: 50, tone: 'brand'},
        {label: 'XXL', valueLabel: '60', detail: '', widthPercent: 60, tone: 'brand'}
      ] as unknown as Parameters<ApplicationInsightsPageComponent['sizeGuideBuckets']>[0];
      const buckets = comp.sizeGuideBuckets(bars);
      expect(buckets.map((bucket) => bucket.valueLabel)).toEqual(['30', '70', '110']);
    });

    it('returns no size buckets for empty input', () => {
      expect(comp.sizeGuideBuckets([])).toEqual([]);
      expect(comp.sizeGuideBuckets(null)).toEqual([]);
    });

    it('reads the median width highlight', () => {
      const highlights = buildPageStub()['hpBandHighlights'] as unknown as Parameters<ApplicationInsightsPageComponent['medianWidth']>[0];
      expect(comp.medianWidth(highlights)).toBe('12 HP');
      expect(comp.medianWidth([])).toBe('');
    });

    it('builds the starter teaser from the sharing mix', () => {
      const mix = buildPageStub()['sharingMix'] as unknown as Parameters<ApplicationInsightsPageComponent['sharingTeaser']>[0];
      expect(comp.sharingTeaser(mix)).toBe('84 shared racks · 42 connected patches to start from');
      expect(comp.sharingTeaser([])).toBe('');
    });

    it('finds private-footprint slices by key', () => {
      const slices = [
        {key: 'racks', label: 'Racks', publicRowLabel: '10', privateRowLabel: '20'},
        {key: 'patches', label: 'Patches', publicRowLabel: '5', privateRowLabel: '8'}
      ] as unknown as Parameters<ApplicationInsightsPageComponent['footprintSlice']>[0];
      expect(comp.footprintSlice(slices, 'racks')?.label).toBe('Racks');
      expect(comp.footprintSlice(slices, 'patches')?.label).toBe('Patches');
      expect(comp.footprintSlice(slices, 'modules')).toBeUndefined();
      expect(comp.footprintSlice([], 'racks')).toBeUndefined();
      expect(comp.footprintSlice(null, 'racks')).toBeUndefined();
    });
  });
});
