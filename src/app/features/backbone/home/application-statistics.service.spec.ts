import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ApplicationStatisticsService } from './application-statistics.service';
import { MinimalModule } from 'src/app/models/module';
import { AnalyticsService } from '../analytics-integration/analytics.service';
import { SupabaseService } from '../../backend/supabase.service';
import { PublicApplicationStatistics } from '../../backend/supabase-queries.models';
import {
  mapRacksTakeaway,
  PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PARITY,
  PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PRIVATE_MAJORITY,
  PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PUBLIC_MAJORITY,
  PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED
} from './application-statistics.footprint-mappers';
import {
  ACTIVITY_TAKEAWAY_HIGH,
  ACTIVITY_TAKEAWAY_IDLE,
  ACTIVITY_TAKEAWAY_QUIET,
  ACTIVITY_TAKEAWAY_STEADY,
  ACTIVITY_TAKEAWAY_SUPPRESSED,
  FRESH_TAKEAWAY_EMPTY,
  FRESH_TAKEAWAY_MIXED,
  FRESH_TAKEAWAY_MODULES_MAJORITY,
  FRESH_TAKEAWAY_PATCHES_MAJORITY,
  FRESH_TAKEAWAY_RACKS_MAJORITY,
  mapActivityTakeaway,
  mapFreshTakeaway
} from './application-statistics.activity-mappers';
import {
  LIBRARY_TAKEAWAY_ABOUT_ONE,
  LIBRARY_TAKEAWAY_BELOW_ONE,
  LIBRARY_TAKEAWAY_MULTIPLE,
  LIBRARY_TAKEAWAY_SUPPRESSED,
  mapLibraryTakeaway
} from './application-statistics.page-mapper';
import {
  MAKERS_TAKEAWAY_CLEAR_LEAD,
  MAKERS_TAKEAWAY_CLOSE_PACK,
  MAKERS_TAKEAWAY_EMPTY,
  MAKERS_TAKEAWAY_SHARED_LEAD,
  MAKERS_TAKEAWAY_SINGLE,
  mapMakersTakeaway
} from './application-statistics.module-mappers';
import {
  HERO_TAKEAWAY_CLEAR_MARGIN,
  HERO_TAKEAWAY_CLOSE_PACK,
  HERO_TAKEAWAY_EMPTY,
  HERO_TAKEAWAY_SHARED_LEAD,
  HERO_TAKEAWAY_SINGLE,
  mapHeroTakeaway
} from './application-statistics.mappers';


describe('ApplicationStatisticsService', () => {
  function buildModule(id: number, name: string, manufacturerName: string): MinimalModule {
    return {
      id,
      name,
      description: '',
      hp: 10,
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      manufacturerId: id,
      manufacturer: {id, name: manufacturerName},
      standard: {id: 0, name: '3U Doepfer'},
      tags: [],
      panels: []
    };
  }
  function build(
    counts: PublicApplicationStatistics = {
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
      publicPatchesUpdatedLast30Days: 9,
      totalRacks: 320,
      privateRacks: 236,
      totalModules: 1500,
      privateModules: 220,
      totalPatches: 120,
      privatePatches: 78
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
        applicationModuleInsights: jasmine.createSpy('GET.applicationModuleInsights').and.returnValue(of(moduleInsights)),
        applicationModuleDiscovery: jasmine.createSpy('GET.applicationModuleDiscovery').and.returnValue(of({
          mostOwned: [
            {id: 5, name: 'Maths', manufacturer: {id: 2, name: 'Intellijel'}, count: 41}
          ],
          mostWanted: [
            {id: 8, name: 'Clouds', manufacturer: {id: 7, name: 'Mutable Instruments'}, count: 29}
          ],
          mostSold: [
            {id: 11, name: 'Dixie II+', manufacturer: {id: 4, name: 'Intellijel'}, count: 13}
          ]
        })),
        publicModulesByIds: jasmine.createSpy('GET.publicModulesByIds').and.returnValue(of([
          buildModule(5, 'Maths', 'Intellijel'),
          buildModule(8, 'Clouds', 'Mutable Instruments'),
          buildModule(11, 'Dixie II+', 'Intellijel')
        ]))
      }
    };

    TestBed.configureTestingModule({
      providers: [
        ApplicationStatisticsService,
        {provide: SupabaseService, useValue: backend},
        {provide: AnalyticsService, useValue: jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture'])}
      ]
    });

    return {
      backend,
      analytics: TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>,
      service: TestBed.inject(ApplicationStatisticsService)
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

  it('maps private-vs-public footprint slices with shares', (done) => {
    const {service} = build();

    service.page$.subscribe((page) => {
      expect(page.privateFootprint.suppressed).toBeFalse();
      expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PRIVATE_MAJORITY);
      expect(page.privateFootprint.slices.map((slice) => ({
        key: slice.key,
        publicCount: slice.publicCount,
        privateCount: slice.privateCount,
        totalCount: slice.totalCount,
        publicSharePercent: slice.publicSharePercent,
        privateSharePercent: slice.privateSharePercent,
        publicRowLabel: slice.publicRowLabel,
        privateRowLabel: slice.privateRowLabel
      }))).toEqual([
        {
          key: 'racks',
          publicCount: 84,
          privateCount: 236,
          totalCount: 320,
          publicSharePercent: 26,
          privateSharePercent: 74,
          publicRowLabel: '84 (26%)',
          privateRowLabel: '236 (74%)'
        },
        {
          key: 'modules',
          publicCount: 1280,
          privateCount: 220,
          totalCount: 1500,
          publicSharePercent: 85,
          privateSharePercent: 15,
          publicRowLabel: '1,280 (85%)',
          privateRowLabel: '220 (15%)'
        },
        {
          key: 'patches',
          publicCount: 42,
          privateCount: 78,
          totalCount: 120,
          publicSharePercent: 35,
          privateSharePercent: 65,
          publicRowLabel: '42 (35%)',
          privateRowLabel: '78 (65%)'
        }
      ]);
      done();
    });
  });

  it('suppresses the private footprint while the snapshot payload predates footprint keys', (done) => {
    const {service} = build({
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
    });

    service.page$.subscribe((page) => {
      expect(page.privateFootprint.suppressed).toBeTrue();
      expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED);
      expect(page.privateFootprint.slices).toEqual([]);
      done();
    });
  });

  it('suppresses footprint slices below the privacy gate without hiding larger universes', (done) => {
    const {service} = build({
      publicModules: 1280,
      publicManufacturers: 96,
      publicProfiles: 240,
      publicModulesUpdatedLast30Days: 64,
      publicRacks: 4,
      publicRackAuthors: 31,
      publicRacksUpdatedLast30Days: 21,
      publicPatches: 42,
      publicPatchConnections: 168,
      publicPatchAuthors: 18,
      publicPatchesUpdatedLast30Days: 9,
      totalRacks: 8,
      privateRacks: 4,
      totalModules: 1500,
      privateModules: 220,
      totalPatches: 120,
      privatePatches: 78
    });

    service.page$.subscribe((page) => {
      expect(page.privateFootprint.suppressed).toBeTrue();
      expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED);
      expect(page.privateFootprint.slices.map((slice) => slice.key)).toEqual(['modules', 'patches']);
      done();
    });
  });

  it('suppresses the footprint card when a rack slice is too thin to show', (done) => {
    const {service} = build({
      publicModules: 1280,
      publicManufacturers: 96,
      publicProfiles: 240,
      publicModulesUpdatedLast30Days: 64,
      publicRacks: 118,
      publicRackAuthors: 31,
      publicRacksUpdatedLast30Days: 21,
      publicPatches: 42,
      publicPatchConnections: 168,
      publicPatchAuthors: 18,
      publicPatchesUpdatedLast30Days: 9,
      totalRacks: 120,
      privateRacks: 2,
      totalModules: 1500,
      privateModules: 220,
      totalPatches: 120,
      privatePatches: 78
    });

    service.page$.subscribe((page) => {
      expect(page.privateFootprint.suppressed).toBeTrue();
      expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED);
      expect(page.privateFootprint.slices.map((slice) => slice.key)).toEqual(['modules', 'patches']);
      done();
    });
  });

  describe('private footprint racks takeaway', () => {
    function racksCounts(publicRacks: number, privateRacks: number, totalRacks: number): PublicApplicationStatistics {
      return {
        publicModules: 1280,
        publicManufacturers: 96,
        publicProfiles: 240,
        publicModulesUpdatedLast30Days: 64,
        publicRacks,
        publicRackAuthors: 31,
        publicRacksUpdatedLast30Days: 21,
        publicPatches: 42,
        publicPatchConnections: 168,
        publicPatchAuthors: 18,
        publicPatchesUpdatedLast30Days: 9,
        totalRacks,
        privateRacks,
        totalModules: 1500,
        privateModules: 220,
        totalPatches: 120,
        privatePatches: 78
      };
    }

    it('derives a public-majority takeaway from live-like shares', (done) => {
      const {service} = build(racksCounts(429, 196, 625));

      service.page$.subscribe((page) => {
        expect(page.privateFootprint.suppressed).toBeFalse();
        expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PUBLIC_MAJORITY);
        done();
      });
    });

    it('derives a near-parity takeaway for an even split', (done) => {
      const {service} = build(racksCounts(50, 50, 100));

      service.page$.subscribe((page) => {
        expect(page.privateFootprint.suppressed).toBeFalse();
        expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PARITY);
        done();
      });
    });

    it('reads exactly 60 percent public as a public majority (inclusive boundary)', (done) => {
      const {service} = build(racksCounts(6, 4, 10));

      service.page$.subscribe((page) => {
        expect(page.privateFootprint.suppressed).toBeFalse();
        expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PUBLIC_MAJORITY);
        done();
      });
    });

    it('reads exactly 60 percent private as a private majority (inclusive boundary)', (done) => {
      const {service} = build(racksCounts(4, 6, 10));

      service.page$.subscribe((page) => {
        expect(page.privateFootprint.suppressed).toBeFalse();
        expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PRIVATE_MAJORITY);
        done();
      });
    });

    it('reads just inside the band as near-parity', (done) => {
      const {service} = build(racksCounts(59, 41, 100));

      service.page$.subscribe((page) => {
        expect(page.privateFootprint.suppressed).toBeFalse();
        expect(page.privateFootprint.racksTakeaway).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PARITY);
        done();
      });
    });

    it('falls back to the generic sentence when the racks slice is missing', () => {
      expect(mapRacksTakeaway(false, undefined)).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED);
      expect(mapRacksTakeaway(true, undefined)).toBe(PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED);
    });
  });

  describe('card takeaways derived from live payloads', () => {
    function seriesPoint(modules: number, racks: number, patches: number) {
      return {date: '2026-09-10', modules, racks, patches};
    }

    function statsWith(overrides: Partial<PublicApplicationStatistics>): PublicApplicationStatistics {
      return {
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
        publicPatchesUpdatedLast30Days: 9,
        totalRacks: 320,
        privateRacks: 236,
        totalModules: 1500,
        privateModules: 220,
        totalPatches: 120,
        privatePatches: 78,
        ...overrides
      };
    }

    it('wires fresh, activity, library, and makers takeaways through the page payload', (done) => {
      const {service} = build();

      service.page$.subscribe((page) => {
        // Default fixture: 9/3/3 activity (modules at exactly 60%), 64/1280
        // updated modules (5%), 126 shared works over 240 profiles, makers
        // 14 vs 9 (1.56x lead).
        expect(page.freshTakeaway).toBe(FRESH_TAKEAWAY_MODULES_MAJORITY);
        expect(page.activityTakeaway).toBe(ACTIVITY_TAKEAWAY_STEADY);
        expect(page.libraryTakeaway).toBe(LIBRARY_TAKEAWAY_BELOW_ONE);
        expect(page.makersTakeaway).toBe(MAKERS_TAKEAWAY_CLEAR_LEAD);
        done();
      });
    });

    it('matches the live snapshot shape probed at implementation time', (done) => {
      const {service} = build(
        statsWith({
          publicModules: 10080,
          publicManufacturers: 743,
          publicProfiles: 613,
          publicModulesUpdatedLast30Days: 480,
          publicRacks: 429,
          publicRackAuthors: 362,
          publicRacksUpdatedLast30Days: 21,
          publicPatches: 36,
          publicPatchConnections: 308,
          publicPatchAuthors: 23,
          publicPatchesUpdatedLast30Days: 3,
          totalRacks: 625,
          privateRacks: 196,
          totalModules: 10172,
          privateModules: 92,
          totalPatches: 38,
          privatePatches: 2
        }),
        undefined,
        [seriesPoint(480, 21, 3)]
      );

      service.page$.subscribe((page) => {
        expect(page.freshTakeaway).toBe(FRESH_TAKEAWAY_MODULES_MAJORITY);
        expect(page.activityTakeaway).toBe(ACTIVITY_TAKEAWAY_STEADY);
        expect(page.libraryTakeaway).toBe(LIBRARY_TAKEAWAY_BELOW_ONE);
        done();
      });
    });

    describe('fresh takeaway', () => {
      it('falls back to the generic sentence for an empty series', () => {
        expect(mapFreshTakeaway([])).toBe(FRESH_TAKEAWAY_EMPTY);
        expect(mapFreshTakeaway([seriesPoint(0, 0, 0)])).toBe(FRESH_TAKEAWAY_EMPTY);
      });

      it('reads exactly 60 percent modules as a module majority (inclusive boundary)', () => {
        expect(mapFreshTakeaway([seriesPoint(6, 2, 2)])).toBe(FRESH_TAKEAWAY_MODULES_MAJORITY);
      });

      it('reads just below the band as mixed', () => {
        expect(mapFreshTakeaway([seriesPoint(59, 41, 0)])).toBe(FRESH_TAKEAWAY_MIXED);
      });

      it('derives rack and patch majorities from live-like shares', () => {
        expect(mapFreshTakeaway([seriesPoint(2, 7, 1)])).toBe(FRESH_TAKEAWAY_RACKS_MAJORITY);
        expect(mapFreshTakeaway([seriesPoint(1, 2, 7)])).toBe(FRESH_TAKEAWAY_PATCHES_MAJORITY);
      });

      it('reads an even split as mixed', () => {
        expect(mapFreshTakeaway([seriesPoint(4, 3, 3)])).toBe(FRESH_TAKEAWAY_MIXED);
      });
    });

    describe('activity takeaway', () => {
      it('falls back to the generic sentence when the catalogue is missing', () => {
        expect(mapActivityTakeaway(statsWith({publicModules: 0}))).toBe(ACTIVITY_TAKEAWAY_SUPPRESSED);
      });

      it('reports an idle month with no share claims', () => {
        expect(mapActivityTakeaway(statsWith({publicModulesUpdatedLast30Days: 0}))).toBe(ACTIVITY_TAKEAWAY_IDLE);
      });

      it('reads exactly 20 percent as high (inclusive boundary)', () => {
        expect(mapActivityTakeaway(statsWith({
          publicModules: 1280,
          publicModulesUpdatedLast30Days: 256
        }))).toBe(ACTIVITY_TAKEAWAY_HIGH);
      });

      it('reads exactly 2 percent as steady (inclusive boundary)', () => {
        expect(mapActivityTakeaway(statsWith({
          publicModules: 1280,
          publicModulesUpdatedLast30Days: 26
        }))).toBe(ACTIVITY_TAKEAWAY_STEADY);
      });

      it('reads just below 2 percent as quiet', () => {
        expect(mapActivityTakeaway(statsWith({
          publicModules: 1280,
          publicModulesUpdatedLast30Days: 25
        }))).toBe(ACTIVITY_TAKEAWAY_QUIET);
      });
    });

    describe('library takeaway', () => {
      it('falls back to the generic sentence when no public profiles exist', () => {
        expect(mapLibraryTakeaway(statsWith({publicProfiles: 0}))).toBe(LIBRARY_TAKEAWAY_SUPPRESSED);
      });

      it('reads less than one shared work per profile', () => {
        expect(mapLibraryTakeaway(statsWith({
          publicRacks: 429,
          publicPatches: 36,
          publicProfiles: 613
        }))).toBe(LIBRARY_TAKEAWAY_BELOW_ONE);
      });

      it('reads exactly one shared work per profile as about one (inclusive boundary)', () => {
        expect(mapLibraryTakeaway(statsWith({
          publicRacks: 100,
          publicPatches: 20,
          publicProfiles: 120
        }))).toBe(LIBRARY_TAKEAWAY_ABOUT_ONE);
      });

      it('reads exactly two shared works per profile as multiple (inclusive boundary)', () => {
        expect(mapLibraryTakeaway(statsWith({
          publicRacks: 200,
          publicPatches: 0,
          publicProfiles: 100
        }))).toBe(LIBRARY_TAKEAWAY_MULTIPLE);
      });
    });

    describe('makers takeaway', () => {
      it('falls back to the generic sentence when no makers updated', () => {
        expect(mapMakersTakeaway([])).toBe(MAKERS_TAKEAWAY_EMPTY);
      });

      it('reports a lone active maker with no share claims', () => {
        expect(mapMakersTakeaway([
          {label: 'Intellijel', count: 26, detail: '26 modules updated in the last 30 days'}
        ])).toBe(MAKERS_TAKEAWAY_SINGLE);
      });

      it('reads an exact tie as a shared lead', () => {
        expect(mapMakersTakeaway([
          {label: 'Intellijel', count: 13, detail: ''},
          {label: 'Erica Synths', count: 13, detail: ''}
        ])).toBe(MAKERS_TAKEAWAY_SHARED_LEAD);
      });

      it('reads exactly 1.5x as a clear lead (inclusive boundary)', () => {
        expect(mapMakersTakeaway([
          {label: 'Intellijel', count: 15, detail: ''},
          {label: 'Mutable Instruments', count: 10, detail: ''}
        ])).toBe(MAKERS_TAKEAWAY_CLEAR_LEAD);
      });

      it('reads a live-like 26 vs 16 lead as a clear lead', () => {
        expect(mapMakersTakeaway([
          {label: 'Intellijel', count: 26, detail: '26 modules updated in the last 30 days'},
          {label: 'Mutable Instruments', count: 16, detail: '16 modules updated in the last 30 days'}
        ])).toBe(MAKERS_TAKEAWAY_CLEAR_LEAD);
      });

      it('reads just below 1.5x as a close pack', () => {
        expect(mapMakersTakeaway([
          {label: 'Intellijel', count: 14, detail: ''},
          {label: 'Mutable Instruments', count: 10, detail: ''}
        ])).toBe(MAKERS_TAKEAWAY_CLOSE_PACK);
      });
    });

    describe('hero takeaway', () => {
      function heroEntry(id: number, count: number) {
        return {id, name: `Module ${ id }`, manufacturer: {id, name: 'Maker'}, count};
      }

      it('falls back to the generic sentence for an empty bucket', () => {
        expect(mapHeroTakeaway([], 'owners')).toBe(HERO_TAKEAWAY_EMPTY);
      });

      it('reports a lone ranked module with no share claims', () => {
        expect(mapHeroTakeaway([heroEntry(1, 1)], 'sales')).toBe(HERO_TAKEAWAY_SINGLE);
      });

      it('reads an exact tie as a shared lead', () => {
        expect(mapHeroTakeaway([heroEntry(1, 1), heroEntry(2, 1)], 'wants')).toBe(HERO_TAKEAWAY_SHARED_LEAD);
      });

      it('reads a live-like 48 vs 24 lead as at least twice as many owners', () => {
        expect(mapHeroTakeaway([heroEntry(1, 48), heroEntry(2, 24)], 'owners'))
          .toBe('The top-ranked module holds at least twice as many owners as the next-ranked design.');
      });

      it('reads just below 2x as a clear margin', () => {
        expect(mapHeroTakeaway([heroEntry(1, 19), heroEntry(2, 10)], 'owners')).toBe(HERO_TAKEAWAY_CLEAR_MARGIN);
      });

      it('reads exactly 1.5x as a clear margin (inclusive boundary)', () => {
        expect(mapHeroTakeaway([heroEntry(1, 15), heroEntry(2, 10)], 'owners')).toBe(HERO_TAKEAWAY_CLEAR_MARGIN);
      });

      it('reads just below 1.5x as a close pack', () => {
        expect(mapHeroTakeaway([heroEntry(1, 14), heroEntry(2, 10)], 'owners')).toBe(HERO_TAKEAWAY_CLOSE_PACK);
      });
    });
  });

  it('captures insights.page_viewed when the 30-day snapshot page loads', (done) => {    const {analytics, backend, service} = build();

    service.page$.subscribe(() => {
      expect(backend.GET.applicationInsightsSnapshot).toHaveBeenCalledWith(30);
      expect(analytics.capture).toHaveBeenCalledWith('insights.page_viewed', {});
      done();
    });
  });

  it('exposes mostOwned as the default hero bucket and captures bucket changes', () => {
    const {analytics, service} = build();
    const seen: string[] = [];

    service.heroBucket$.subscribe((bucket) => seen.push(bucket));

    expect(seen).toEqual(['mostOwned']);
    service.selectHeroBucket('mostOwned');
    expect(analytics.capture).not.toHaveBeenCalledWith('insights.hero_bucket_viewed', {bucket: 'mostOwned'});
    service.selectHeroBucket('mostWanted');
    expect(analytics.capture).toHaveBeenCalledWith('insights.hero_bucket_viewed', {bucket: 'mostWanted'});
  });

  it('captures hero module clicks with bucket, module, rank, and count', () => {
    const {analytics, service} = build();

    service.trackHeroModuleClicked('mostSold', {id: 11, count: 13}, 2);

    expect(analytics.capture).toHaveBeenCalledWith('insights.hero_module_clicked', {
      bucket: 'mostSold',
      module_id: 11,
      rank: 2,
      count: 13
    });
  });

  it('captures support link clicks with the link target', () => {
    const {analytics, service} = build();

    service.trackSupportLinkClicked('fresh_browse_racks');

    expect(analytics.capture).toHaveBeenCalledWith('insights.support_link_clicked', {target: 'fresh_browse_racks'});
  });

  it('captures discovery rail clicks with the rail target', () => {
    const {analytics, service} = build();

    service.trackDiscoveryRailClicked('makers');

    expect(analytics.capture).toHaveBeenCalledWith('insights.discovery_rail_clicked', {target: 'makers'});
  });

  it('captures method-details opens without props', () => {
    const {analytics, service} = build();

    service.trackMethodDetailsOpened();

    expect(analytics.capture).toHaveBeenCalledWith('insights.method_details_opened', {});
  });

  it('captures insights entry clicks with the entry source', () => {
    const {analytics, service} = build();

    service.trackInsightsEntryClicked('home_insights_section');

    expect(analytics.capture).toHaveBeenCalledWith('insights.entry_clicked', {source: 'home_insights_section'});
  });

  it('maps discovery buckets from the backend snapshot', (done) => {
    const {backend, service} = build();

    service.discovery$.subscribe((snapshot) => {
      expect(backend.GET.applicationModuleDiscovery).toHaveBeenCalledWith(6, 1);
      expect(backend.GET.publicModulesByIds).toHaveBeenCalledWith([5, 8, 11]);
      expect(snapshot.mostOwned[0]).toEqual(jasmine.objectContaining({
        id: 5,
        name: 'Maths',
        manufacturer: {id: 2, name: 'Intellijel'},
        count: 41
      }));
      expect(snapshot.mostOwned[0].module?.name).toBe('Maths');
      expect(snapshot.mostWanted[0].name).toBe('Clouds');
      expect(snapshot.mostSold[0].count).toBe(13);
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
