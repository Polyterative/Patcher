import { of } from 'rxjs';
import { ApplicationStatisticsService } from './application-statistics.service';


describe('ApplicationStatisticsService', () => {
  function build(counts = {
    publicModules: 1280,
    publicManufacturers: 96,
    publicRacks: 84,
    publicRackAuthors: 31,
    publicPatches: 42,
    publicPatchAuthors: 18
  }) {
    const backend = {
      GET: {
        applicationStatistics: jasmine.createSpy('GET.applicationStatistics').and.returnValue(of(counts))
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
      publicRacks: 0,
      publicRackAuthors: 0,
      publicPatches: 0,
      publicPatchAuthors: 0
    });

    service.teaser$.subscribe((teaser) => {
      expect(teaser.interpretation).toContain('public catalogue is live');
      expect(teaser.emptyMessage).toContain('Public insight snapshots');
      done();
    });
  });

  it('maps a dedicated insights page model from richer aggregate counts', (done) => {
    const {service} = build();

    service.page$.subscribe((page) => {
      expect(page.overview).toEqual([
        {name: 'Public modules', value: 1280, icon: 'view_module'},
        {name: 'Manufacturers represented', value: 96, icon: 'precision_manufacturing'},
        {name: 'Shared racks', value: 84, icon: 'space_dashboard'},
        {name: 'Shared patches', value: 42, icon: 'cable'}
      ]);
      expect(page.sharing).toEqual([
        {name: 'Profiles sharing racks', value: 31, icon: 'dashboard_customize'},
        {name: 'Profiles sharing patches', value: 18, icon: 'hub'}
      ]);
      expect(page.derived).toEqual([
        {name: 'Modules per represented maker', value: 13, icon: 'rule'},
        {name: 'Racks per sharing profile', value: 3, icon: 'splitscreen'},
        {name: 'Patches per sharing profile', value: 2, icon: 'linear_scale'}
      ]);
      expect(page.methodology.length).toBe(4);
      expect(page.interpretation).toContain('Rounded ratios');
      done();
    });
  });
});
