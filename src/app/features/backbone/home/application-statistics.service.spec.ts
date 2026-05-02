import { of } from 'rxjs';
import { ApplicationStatisticsService } from './application-statistics.service';


describe('ApplicationStatisticsService', () => {
  function build(
    counts = {
      publicModules: 1280,
      publicManufacturers: 96,
      publicProfiles: 240,
      publicModulesUpdatedLast30Days: 64,
      publicRacks: 84,
      publicRackAuthors: 31,
      publicRacksUpdatedLast30Days: 21,
      publicPatches: 42,
      publicPatchConnections: 168,
      publicPatchAuthors: 18,
      publicPatchesUpdatedLast30Days: 9
    },
    moduleInsights = {
      topManufacturers: [
        {label: 'Make Noise', count: 120, detail: '120 public modules'},
        {label: 'Mutable Instruments', count: 96, detail: '96 public modules'}
      ],
      activeManufacturers: [
        {label: 'Intellijel', count: 14, detail: '14 modules updated in the last 30 days'},
        {label: 'ALM Busy Circuits', count: 9, detail: '9 modules updated in the last 30 days'}
      ],
      widestManufacturers: [
        {label: 'Frap Tools', count: 22, detail: '22 HP average across 15 public modules'},
        {label: 'Make Noise', count: 18, detail: '18 HP average across 120 public modules'}
      ],
      oneUManufacturers: [
        {label: 'Intellijel', count: 72, detail: '72% 1U share across 18 public modules'},
        {label: 'Pulp Logic', count: 64, detail: '64% 1U share across 11 public modules'}
      ],
      standardMix: [
        {label: '3U', count: 1000, detail: '1000 public modules in this format'},
        {label: 'Intellijel 1U', count: 180, detail: '180 public modules in this format'},
        {label: 'Pulp Logic 1U', count: 20, detail: '20 public modules in this format'}
      ],
      hpBands: [
        {label: 'Compact (0-8 HP)', count: 340, detail: '340 modules in this size band'},
        {label: 'Utility (9-16 HP)', count: 510, detail: '510 modules in this size band'},
        {label: 'Feature (17-28 HP)', count: 320, detail: '320 modules in this size band'},
        {label: 'Large (29+ HP)', count: 110, detail: '110 modules in this size band'}
      ],
      averageHp: 14,
      medianHp: 12
    },
    activitySeries = [
      {date: '2026-05-01', modules: 4, racks: 1, patches: 0},
      {date: '2026-05-02', modules: 0, racks: 2, patches: 1},
      {date: '2026-05-03', modules: 5, racks: 0, patches: 2}
    ]
  ) {
    const backend = {
      GET: {
        applicationStatistics: jasmine.createSpy('GET.applicationStatistics').and.returnValue(of(counts)),
        applicationActivitySeries: jasmine.createSpy('GET.applicationActivitySeries').and.returnValue(of(activitySeries)),
        applicationModuleInsights: jasmine.createSpy('GET.applicationModuleInsights').and.returnValue(of(moduleInsights))
      }
    };

    return {
      backend,
      service: new ApplicationStatisticsService(backend as any)
    };
  }

  it('maps backend aggregates into home teaser statistics and methodology copy', (done) => {
    const {
      backend,
      service
    } = build();

    service.teaser$.subscribe((teaser) => {
      expect(backend.GET.applicationStatistics).toHaveBeenCalled();
      expect(teaser.statistics).toEqual([
        {name: 'Public modules', value: 1280, icon: 'view_module'},
        {name: 'Shared racks', value: 84, icon: 'space_dashboard'},
        {name: 'Shared patches', value: 42, icon: 'cable'}
      ]);
      expect(teaser.interpretation).toContain('real racks and patches');
      expect(teaser.methodology).toContain('public items from public profiles');
      done();
    });
  });

  it('uses softer interpretation copy while shared public work is still absent', (done) => {
    const {service} = build({
      publicModules: 250,
      publicManufacturers: 40,
      publicProfiles: 18,
      publicModulesUpdatedLast30Days: 2,
      publicRacks: 0,
      publicRackAuthors: 0,
      publicRacksUpdatedLast30Days: 0,
      publicPatches: 0,
      publicPatchConnections: 0,
      publicPatchAuthors: 0,
      publicPatchesUpdatedLast30Days: 0
    });

    service.teaser$.subscribe((teaser) => {
      expect(teaser.interpretation).toContain('public catalogue is live');
      expect(teaser.emptyMessage).toContain('Public insight snapshots');
      done();
    });
  });

  it('maps a chart-led insights page from aggregate counts and daily activity', (done) => {
    const {backend, service} = build();

    service.page$.subscribe((page) => {
      expect(backend.GET.applicationActivitySeries).toHaveBeenCalledWith(30);
      expect(backend.GET.applicationModuleInsights).toHaveBeenCalled();
      expect(page.heroHighlights).toEqual([
        {label: 'Shared works', value: '126', icon: 'layers'},
        {label: '30-day updates', value: '15', icon: 'timeline'},
        {label: 'Rack + patch sharers', value: '49', icon: 'groups'}
      ]);
      expect(page.footprintSnapshot.map((metric) => ({label: metric.label, valueLabel: metric.valueLabel, icon: metric.icon}))).toEqual([
        {label: 'Public modules', valueLabel: '1,280', icon: 'view_module'},
        {label: 'Represented makers', valueLabel: '96', icon: 'precision_manufacturing'},
        {label: 'Public profiles', valueLabel: '240', icon: 'person_search'},
        {label: 'Shared works', valueLabel: '126', icon: 'layers'}
      ]);
      expect(page.activityChart.days).toEqual([
        jasmine.objectContaining({date: '2026-05-01', total: 5, modules: 4, racks: 1, patches: 0}),
        jasmine.objectContaining({date: '2026-05-02', total: 3, modules: 0, racks: 2, patches: 1}),
        jasmine.objectContaining({date: '2026-05-03', total: 7, modules: 5, racks: 0, patches: 2})
      ]);
      expect(page.activityChart.legend).toEqual([
        {label: 'Modules', valueLabel: '9', toneClass: 'modules'},
        {label: 'Racks', valueLabel: '3', toneClass: 'racks'},
        {label: 'Patches', valueLabel: '3', toneClass: 'patches'}
      ]);
      expect(page.standardMixBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '3U', valueLabel: '1,000'},
        {label: 'Intellijel 1U', valueLabel: '180'},
        {label: 'Pulp Logic 1U', valueLabel: '20'}
      ]);
      expect(page.standardMixHighlights).toEqual([
        {label: 'Formats represented', value: '3', icon: 'category'},
        {label: 'Dominant standard', value: '3U (1,000)', icon: 'emoji_events'},
        {label: '1U footprint', value: '16%', icon: 'view_week'}
      ]);
      expect(page.hpBandBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Compact (0-8 HP)', valueLabel: '340'},
        {label: 'Utility (9-16 HP)', valueLabel: '510'},
        {label: 'Feature (17-28 HP)', valueLabel: '320'},
        {label: 'Large (29+ HP)', valueLabel: '110'}
      ]);
      expect(page.hpBandHighlights).toEqual([
        {label: 'Average width', value: '14 HP', icon: 'straighten'},
        {label: 'Median width', value: '12 HP', icon: 'swap_horiz'},
        {label: 'Recent module updates', value: '64', icon: 'schedule'}
      ]);
      expect(page.topManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Make Noise', valueLabel: '120'},
        {label: 'Mutable Instruments', valueLabel: '96'}
      ]);
      expect(page.activeManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Intellijel', valueLabel: '14'},
        {label: 'ALM Busy Circuits', valueLabel: '9'}
      ]);
      expect(page.widestManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Frap Tools', valueLabel: '22 HP'},
        {label: 'Make Noise', valueLabel: '18 HP'}
      ]);
      expect(page.oneUManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Intellijel', valueLabel: '72%'},
        {label: 'Pulp Logic', valueLabel: '64%'}
      ]);
      expect(page.sharingMix).toEqual([
        {label: 'Racks', valueLabel: '84 (67%)', widthPercent: 67, tone: 'emerald'},
        {label: 'Patches', valueLabel: '42 (33%)', widthPercent: 33, tone: 'brand'}
      ]);
      expect(page.sharingRateBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {
          label: 'Rack-sharing profiles / 100 public profiles',
          valueLabel: '13 / 100'
        },
        {
          label: 'Patch-sharing profiles / 100 public profiles',
          valueLabel: '8 / 100'
        }
      ]);
      expect(page.patchDepthBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Connections per shared patch', valueLabel: '4'},
        {label: 'Connections per patch-sharing profile', valueLabel: '9'},
        {label: 'Shared works per represented maker', valueLabel: '1'},
        {label: 'Shared works updated / 100 shared works', valueLabel: '24 / 100'}
      ]);
      done();
    });
  });

  it('suppresses low-volume rate bars while preserving headline counts', (done) => {
    const {service} = build(
      {
        publicModules: 20,
        publicManufacturers: 2,
        publicProfiles: 8,
        publicModulesUpdatedLast30Days: 1,
        publicRacks: 5,
        publicRackAuthors: 2,
        publicRacksUpdatedLast30Days: 1,
        publicPatches: 4,
        publicPatchConnections: 8,
        publicPatchAuthors: 1,
        publicPatchesUpdatedLast30Days: 1
      },
      {
        topManufacturers: [
          {label: 'Mutable Instruments', count: 11, detail: '11 public modules'},
          {label: 'Intellijel', count: 9, detail: '9 public modules'}
        ],
        activeManufacturers: [
          {label: 'Mutable Instruments', count: 1, detail: '1 modules updated in the last 30 days'}
        ],
        widestManufacturers: [
          {label: 'Mutable Instruments', count: 12, detail: '12 HP average across 11 public modules'},
          {label: 'Intellijel', count: 10, detail: '10 HP average across 9 public modules'}
        ],
        oneUManufacturers: [
          {label: 'Intellijel', count: 22, detail: '22% 1U share across 9 public modules'}
        ],
        standardMix: [
          {label: '3U', count: 18, detail: '18 public modules in this format'},
          {label: 'Intellijel 1U', count: 2, detail: '2 public modules in this format'}
        ],
        hpBands: [
          {label: 'Compact (0-8 HP)', count: 6, detail: '6 modules in this size band'},
          {label: 'Utility (9-16 HP)', count: 10, detail: '10 modules in this size band'},
          {label: 'Feature (17-28 HP)', count: 4, detail: '4 modules in this size band'}
        ],
        averageHp: 12,
        medianHp: 10
      },
      [
        {date: '2026-05-01', modules: 1, racks: 0, patches: 0},
        {date: '2026-05-02', modules: 0, racks: 1, patches: 0},
        {date: '2026-05-03', modules: 0, racks: 0, patches: 1}
      ]
    );

    service.page$.subscribe((page) => {
      expect(page.heroHighlights).toEqual([
        {label: 'Shared works', value: '9', icon: 'layers'},
        {label: '30-day updates', value: '3', icon: 'timeline'},
        {label: 'Rack + patch sharers', value: '3', icon: 'groups'}
      ]);
      expect(page.sharingRateBars).toEqual([]);
      expect(page.patchDepthBars).toEqual([]);
      expect(page.widestManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Mutable Instruments', valueLabel: '12 HP'},
        {label: 'Intellijel', valueLabel: '10 HP'}
      ]);
      expect(page.oneUManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Intellijel', valueLabel: '22%'}
      ]);
      expect(page.sharingMix).toEqual([
        {label: 'Racks', valueLabel: '5 (56%)', widthPercent: 56, tone: 'emerald'},
        {label: 'Patches', valueLabel: '4 (44%)', widthPercent: 44, tone: 'brand'}
      ]);
      expect(page.footprintHighlights[2]).toEqual({
        label: 'Modules updated in 30 days',
        value: '1',
        icon: 'schedule'
      });
      expect(page.standardMixHighlights).toEqual([
        {label: 'Formats represented', value: '2', icon: 'category'},
        {label: 'Dominant standard', value: '3U (18)', icon: 'emoji_events'},
        {label: '1U footprint', value: '10%', icon: 'view_week'}
      ]);
      expect(page.hpBandHighlights).toEqual([
        {label: 'Average width', value: '12 HP', icon: 'straighten'},
        {label: 'Median width', value: '10 HP', icon: 'swap_horiz'},
        {label: 'Recent module updates', value: '1', icon: 'schedule'}
      ]);
      expect(page.activityChart.highlights).toEqual([
        {label: 'Active days', value: '3 / 30', icon: 'calendar_view_month'},
        {label: 'Busiest day', value: '1', icon: 'bolt'},
        {label: 'Total 30-day updates', value: '3', icon: 'show_chart'}
      ]);
      done();
    });
  });
});
