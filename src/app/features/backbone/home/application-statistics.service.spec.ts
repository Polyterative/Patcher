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
      standardActivity: [
        {label: '3U', count: 58, detail: '58 modules updated in the last 30 days'},
        {label: 'Intellijel 1U', count: 5, detail: '5 modules updated in the last 30 days'},
        {label: 'Pulp Logic 1U', count: 1, detail: '1 modules updated in the last 30 days'}
      ],
      standardWidthAverages: [
        {label: '3U', count: 15, detail: '15 HP average width'},
        {label: 'Intellijel 1U', count: 12, detail: '12 HP average width'},
        {label: 'Pulp Logic 1U', count: 6, detail: '6 HP average width'}
      ],
      standardManufacturerCounts: [
        {label: '3U', count: 80, detail: '80 makers represented in this format'},
        {label: 'Intellijel 1U', count: 14, detail: '14 makers represented in this format'},
        {label: 'Pulp Logic 1U', count: 5, detail: '5 makers represented in this format'}
      ],
      hpBands: [
        {label: '0-2 HP', count: 60, detail: '60 modules in this size band'},
        {label: '3-5 HP', count: 110, detail: '110 modules in this size band'},
        {label: '6-8 HP', count: 170, detail: '170 modules in this size band'},
        {label: '9-16 HP', count: 510, detail: '510 modules in this size band'},
        {label: '17-28 HP', count: 320, detail: '320 modules in this size band'},
        {label: '29+ HP', count: 110, detail: '110 modules in this size band'}
      ],
      hpBandActivity: [
        {label: '0-2 HP', count: 4, detail: '4 modules updated in the last 30 days'},
        {label: '3-5 HP', count: 6, detail: '6 modules updated in the last 30 days'},
        {label: '6-8 HP', count: 8, detail: '8 modules updated in the last 30 days'},
        {label: '9-16 HP', count: 28, detail: '28 modules updated in the last 30 days'},
        {label: '17-28 HP', count: 12, detail: '12 modules updated in the last 30 days'},
        {label: '29+ HP', count: 6, detail: '6 modules updated in the last 30 days'}
      ],
      hpExact: [
        {label: '8 HP', count: 180, detail: '180 modules at this exact width'},
        {label: '6 HP', count: 140, detail: '140 modules at this exact width'},
        {label: '10 HP', count: 120, detail: '120 modules at this exact width'},
        {label: '12 HP', count: 115, detail: '115 modules at this exact width'},
        {label: '4 HP', count: 95, detail: '95 modules at this exact width'},
        {label: '14 HP', count: 90, detail: '90 modules at this exact width'}
      ],
      freshnessWindows: [
        {label: 'Updated in 7 days', count: 40, detail: '40 public modules updated in the last week'},
        {label: 'Updated in 30 days', count: 64, detail: '64 public modules updated in the last month'},
        {label: 'Updated in 90 days', count: 150, detail: '150 public modules updated in the last quarter'},
        {label: 'Updated in 365 days', count: 610, detail: '610 public modules updated in the last year'}
      ],
      createdWindows: [
        {label: 'Added in last year', count: 320, detail: '320 public modules were added in the last year'},
        {label: 'Added 1-2 years ago', count: 410, detail: '410 public modules were added one to two years ago'},
        {label: 'Added 2-3 years ago', count: 290, detail: '290 public modules were added two to three years ago'},
        {label: 'Added over 3 years ago', count: 260, detail: '260 public modules were added over three years ago'}
      ],
      topFiveManufacturerShare: 44,
      soloManufacturerCount: 21,
      medianModulesPerManufacturer: 8,
      medianCatalogueAgeYears: 2,
      staleModules: 670,
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
        applicationInsightsSnapshot: jasmine.createSpy('GET.applicationInsightsSnapshot').and.returnValue(of({
          statistics: counts,
          activitySeries,
          moduleInsights
        })),
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
      expect(teaser.interpretation).toContain('Explore public racks and patches');
      expect(teaser.methodology).toContain('Rack counts come from shared racks on public profiles');
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
      expect(backend.GET.applicationInsightsSnapshot).toHaveBeenCalledWith(30);
      expect(backend.GET.applicationActivitySeries).not.toHaveBeenCalled();
      expect(backend.GET.applicationModuleInsights).not.toHaveBeenCalled();
      expect(page.heroHighlights).toEqual([
        {label: 'Public modules', value: '1,280', icon: 'view_module'},
        {label: 'Library momentum', value: '5%', icon: 'timeline'},
        {label: 'Represented makers', value: '96', icon: 'precision_manufacturing'}
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
      expect(page.activityChart.momentum).toEqual([
        {label: 'Modules', valueLabel: '9 in last 7d', deltaLabel: '+9 vs previous 7', toneClass: 'modules'},
        {label: 'Racks', valueLabel: '3 in last 7d', deltaLabel: '+3 vs previous 7', toneClass: 'racks'},
        {label: 'Patches', valueLabel: '3 in last 7d', deltaLabel: '+3 vs previous 7', toneClass: 'patches'}
      ]);
      expect(page.standardMixBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '3U', valueLabel: '1,000'},
        {label: 'Intellijel 1U', valueLabel: '180'},
        {label: 'Pulp Logic 1U', valueLabel: '20'}
      ]);
      expect(page.standardActivityBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '3U', valueLabel: '58'},
        {label: 'Intellijel 1U', valueLabel: '5'},
        {label: 'Pulp Logic 1U', valueLabel: '1'}
      ]);
      expect(page.standardWidthBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '3U', valueLabel: '15 HP'},
        {label: 'Intellijel 1U', valueLabel: '12 HP'},
        {label: 'Pulp Logic 1U', valueLabel: '6 HP'}
      ]);
      expect(page.standardManufacturerBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '3U', valueLabel: '80'},
        {label: 'Intellijel 1U', valueLabel: '14'},
        {label: 'Pulp Logic 1U', valueLabel: '5'}
      ]);
      expect(page.standardMixHighlights).toEqual([
        {label: 'Formats represented', value: '3', icon: 'category'},
        {label: 'Dominant standard share', value: '78%', icon: 'emoji_events'},
        {label: 'Leading format by updates', value: '3U (58 in 30d)', icon: 'bolt'},
        {label: 'Momentum leader (30d shift)', value: '3U (+12.5%)', icon: 'trending_up'}
      ]);
      expect(page.hpBandBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '0-2 HP', valueLabel: '60'},
        {label: '3-5 HP', valueLabel: '110'},
        {label: '6-8 HP', valueLabel: '170'},
        {label: '9-16 HP', valueLabel: '510'},
        {label: '17-28 HP', valueLabel: '320'},
        {label: '29+ HP', valueLabel: '110'}
      ]);
      expect(page.hpBandActivityBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '0-2 HP', valueLabel: '4'},
        {label: '3-5 HP', valueLabel: '6'},
        {label: '6-8 HP', valueLabel: '8'},
        {label: '9-16 HP', valueLabel: '28'},
        {label: '17-28 HP', valueLabel: '12'},
        {label: '29+ HP', valueLabel: '6'}
      ]);
      expect(page.hpExactBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '8 HP', valueLabel: '180'},
        {label: '6 HP', valueLabel: '140'},
        {label: '10 HP', valueLabel: '120'},
        {label: '12 HP', valueLabel: '115'},
        {label: '4 HP', valueLabel: '95'},
        {label: '14 HP', valueLabel: '90'}
      ]);
      expect(page.hpBandVelocityBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '0-2 HP', valueLabel: '7%'},
        {label: '3-5 HP', valueLabel: '5%'},
        {label: '6-8 HP', valueLabel: '5%'},
        {label: '9-16 HP', valueLabel: '5%'},
        {label: '17-28 HP', valueLabel: '4%'},
        {label: '29+ HP', valueLabel: '5%'}
      ]);
      expect(page.hpBandHighlights).toEqual([
        {label: 'Median width', value: '12 HP', icon: 'straighten'},
        {label: '0-5 HP share', value: '13%', icon: 'view_column'},
        {label: '17+ HP share', value: '34%', icon: 'splitscreen'},
        {label: 'Fastest-moving width', value: '0-2 HP (7 / 100)', icon: 'bolt'}
      ]);
      expect(page.moduleFreshnessBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Fresh (0-7 days)', valueLabel: '40'},
        {label: 'Recent (8-30 days)', valueLabel: '24'},
        {label: 'Deceleration zone (31-90 days)', valueLabel: '86'},
        {label: 'Long-tail maintenance (91-365 days)', valueLabel: '460'},
        {label: 'Older than a year', valueLabel: '670'}
      ]);
      expect(page.moduleCatalogueAgeBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Added in last year', valueLabel: '320'},
        {label: 'Added 1-2 years ago', valueLabel: '410'},
        {label: 'Added 2-3 years ago', valueLabel: '290'},
        {label: 'Added over 3 years ago', valueLabel: '260'}
      ]);
      expect(page.moduleFreshnessHighlights).toEqual([
        {label: 'Active in 30 days', value: '5%', icon: 'bolt'},
        {label: 'This week / 30d activity', value: '63%', icon: 'moving'},
        {label: 'Older than a year', value: '670 (52%)', icon: 'history'},
        {label: 'Median catalogue age', value: '2 years', icon: 'inventory_2'}
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
      expect(page.makerHighlights).toEqual([
        {label: 'Top 5 maker share', value: '44%', icon: 'pie_chart'},
        {label: 'Single-module makers', value: '21', icon: 'filter_1'},
        {label: 'Median maker catalogue', value: '8 modules', icon: 'balance'}
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
      expect(page.sharingHighlights).toEqual([
        {label: 'Rack sharers / 100 profiles', value: '13 / 100', icon: 'dashboard_customize'},
        {label: 'Patch sharers / 100 profiles', value: '8 / 100', icon: 'hub'},
        {label: '30-day update rate', value: 'Racks 25% · Patches 21%', icon: 'trending_up'},
        {label: 'Connections per shared patch', value: '4', icon: 'share'}
      ]);
      expect(page.patchDepthBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Active patches / 100 shared patches (30d)', valueLabel: '21 / 100'},
        {label: 'Connections per shared patch', valueLabel: '4'},
        {label: 'Connections per 100 patch authors', valueLabel: '933 / 100'},
        {label: 'Shared patches / 100 represented makers', valueLabel: '44 / 100'}
      ]);
      expect(page.patchHighlights).toEqual([
        {label: 'Connections in public patches', value: '168', icon: 'linear_scale'},
        {label: 'Profiles sharing patches', value: '18', icon: 'hub'},
        {label: 'Recent patch updates', value: '9', icon: 'timelapse'}
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
        standardActivity: [
          {label: '3U', count: 1, detail: '1 modules updated in the last 30 days'}
        ],
        standardWidthAverages: [
          {label: '3U', count: 12, detail: '12 HP average width'},
          {label: 'Intellijel 1U', count: 8, detail: '8 HP average width'}
        ],
        standardManufacturerCounts: [
          {label: '3U', count: 2, detail: '2 makers represented in this format'},
          {label: 'Intellijel 1U', count: 1, detail: '1 makers represented in this format'}
        ],
        hpBands: [
          {label: '0-2 HP', count: 2, detail: '2 modules in this size band'},
          {label: '3-5 HP', count: 4, detail: '4 modules in this size band'},
          {label: '9-16 HP', count: 10, detail: '10 modules in this size band'},
          {label: '17-28 HP', count: 4, detail: '4 modules in this size band'}
        ],
        hpBandActivity: [
          {label: '3-5 HP', count: 1, detail: '1 modules updated in the last 30 days'}
        ],
        hpExact: [
          {label: '2 HP', count: 2, detail: '2 modules at this exact width'},
          {label: '4 HP', count: 4, detail: '4 modules at this exact width'},
          {label: '10 HP', count: 6, detail: '6 modules at this exact width'},
          {label: '12 HP', count: 4, detail: '4 modules at this exact width'},
          {label: '18 HP', count: 4, detail: '4 modules at this exact width'}
        ],
        freshnessWindows: [
          {label: 'Updated in 7 days', count: 1, detail: '1 public modules updated in the last week'},
          {label: 'Updated in 30 days', count: 1, detail: '1 public modules updated in the last month'},
          {label: 'Updated in 90 days', count: 4, detail: '4 public modules updated in the last quarter'},
          {label: 'Updated in 365 days', count: 9, detail: '9 public modules updated in the last year'}
        ],
        createdWindows: [
          {label: 'Added in last year', count: 2, detail: '2 public modules were added in the last year'},
          {label: 'Added 1-2 years ago', count: 5, detail: '5 public modules were added one to two years ago'},
          {label: 'Added 2-3 years ago', count: 7, detail: '7 public modules were added two to three years ago'},
          {label: 'Added over 3 years ago', count: 6, detail: '6 public modules were added over three years ago'}
        ],
        topFiveManufacturerShare: 100,
        soloManufacturerCount: 0,
        medianModulesPerManufacturer: 10,
        medianCatalogueAgeYears: 3,
        staleModules: 11,
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
        {label: 'Public modules', value: '20', icon: 'view_module'},
        {label: 'Library momentum', value: '5%', icon: 'timeline'},
        {label: 'Represented makers', value: '2', icon: 'precision_manufacturing'}
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
        {label: 'Dominant standard share', value: '90%', icon: 'emoji_events'},
        {label: 'Leading format by updates', value: '3U (1 in 30d)', icon: 'bolt'},
        {label: 'Momentum leader (30d shift)', value: '3U (+10.0%)', icon: 'trending_up'}
      ]);
      expect(page.hpBandHighlights).toEqual([
        {label: 'Median width', value: '10 HP', icon: 'straighten'},
        {label: '0-5 HP share', value: '30%', icon: 'view_column'},
        {label: '17+ HP share', value: '20%', icon: 'splitscreen'},
        {label: 'Fastest-moving width', value: '3-5 HP (25 / 100)', icon: 'bolt'}
      ]);
      expect(page.hpBandVelocityBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: '0-2 HP', valueLabel: '0%'},
        {label: '3-5 HP', valueLabel: '25%'},
        {label: '9-16 HP', valueLabel: '0%'},
        {label: '17-28 HP', valueLabel: '0%'}
      ]);
      expect(page.moduleCatalogueAgeBars.map((bar) => ({label: bar.label, valueLabel: bar.valueLabel}))).toEqual([
        {label: 'Added in last year', valueLabel: '2'},
        {label: 'Added 1-2 years ago', valueLabel: '5'},
        {label: 'Added 2-3 years ago', valueLabel: '7'},
        {label: 'Added over 3 years ago', valueLabel: '6'}
      ]);
      expect(page.moduleFreshnessHighlights).toEqual([
        {label: 'Active in 30 days', value: '5%', icon: 'bolt'},
        {label: 'This week / 30d activity', value: '100%', icon: 'moving'},
        {label: 'Older than a year', value: '11 (55%)', icon: 'history'},
        {label: 'Median catalogue age', value: '3 years', icon: 'inventory_2'}
      ]);
      expect(page.makerHighlights).toEqual([
        {label: 'Top 5 maker share', value: '100%', icon: 'pie_chart'},
        {label: 'Single-module makers', value: '0', icon: 'filter_1'},
        {label: 'Median maker catalogue', value: '10 modules', icon: 'balance'}
      ]);
      expect(page.activityChart.highlights).toEqual([
        {label: 'Active days', value: '3 / 30', icon: 'calendar_view_month'},
        {label: 'Last 7 days', value: '3', icon: 'date_range'},
        {label: 'vs previous 7', value: '+3', icon: 'trending_up'},
        {label: 'Leading activity type', value: 'Modules', icon: 'stacked_line_chart'},
        {label: 'Busiest 7-day stretch', value: '3', icon: 'whatshot'},
        {label: 'Peak day total', value: '1', icon: 'bolt'}
      ]);
      done();
    });
  });

  it('keeps sharing mix widths within 100 percent when one segment is tiny', (done) => {
    const {service} = build(
      {
        publicModules: 250,
        publicManufacturers: 40,
        publicProfiles: 18,
        publicModulesUpdatedLast30Days: 2,
        publicRacks: 95,
        publicRackAuthors: 9,
        publicRacksUpdatedLast30Days: 4,
        publicPatches: 5,
        publicPatchConnections: 10,
        publicPatchAuthors: 3,
        publicPatchesUpdatedLast30Days: 1
      }
    );

    service.page$.subscribe((page) => {
      expect(page.sharingMix).toEqual([
        {label: 'Racks', valueLabel: '95 (95%)', widthPercent: 88, tone: 'emerald'},
        {label: 'Patches', valueLabel: '5 (5%)', widthPercent: 12, tone: 'brand'}
      ]);
      done();
    });
  });
});
