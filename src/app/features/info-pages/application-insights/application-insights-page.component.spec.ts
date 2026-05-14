import { ApplicationInsightsPageComponent } from './application-insights-page.component';
import { ApplicationStatisticsService } from '../../backbone/home/application-statistics.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { BehaviorSubject, Subject } from 'rxjs';

function mockStatistics(page$?: Subject<any>): ApplicationStatisticsService {
  return {
    page$: page$ ?? new Subject()
  } as unknown as ApplicationStatisticsService;
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

describe('ApplicationInsightsPageComponent', () => {
  let stats: ApplicationStatisticsService;
  let seo: SeoAndUtilsService;
  let comp: ApplicationInsightsPageComponent;

  beforeEach(() => {
    stats = mockStatistics();
    seo = mockSeo();
    comp = new ApplicationInsightsPageComponent(stats, seo);
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
  });

  describe('vm$ stream', () => {
    it('emits isLoading=true as first value (from startWith)', (done) => {
      // Use Subject so BehaviorSubject doesn't immediately override startWith
      const page$ = new Subject<any>();
      const c = new ApplicationInsightsPageComponent(mockStatistics(page$), mockSeo());
      let firstEmission = true;
      c.vm$.subscribe((vm) => {
        if (firstEmission) {
          firstEmission = false;
          expect(vm.isLoading).toBeTrue();
          expect(vm.page).toBeNull();
          done();
        }
      });
    });

    it('emits isLoading=false when page$ emits a value', (done) => {
      const page$ = new Subject<any>();
      const c = new ApplicationInsightsPageComponent(mockStatistics(page$), mockSeo());
      let count = 0;
      c.vm$.subscribe((vm) => {
        count++;
        if (count === 2) {
          expect(vm.isLoading).toBeFalse();
          expect(vm.page).toEqual(jasmine.objectContaining({}));
          done();
        }
      });
      page$.next({ modules: 0 });
    });
  });
});
