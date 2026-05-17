import { RackBrowserRootComponent } from './rack-browser-root.component';
import { RackBrowserDataService } from 'src/app/features/routes/rack/rack-browser-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';

function mockDataService(): RackBrowserDataService {
  return {
    loadMore$: new Subject<void>(),
    racksList$: new BehaviorSubject(null),
    updateRacksList$: new Subject<void>(),
    hasMoreRacks$: new BehaviorSubject(false),
    remainingRacksCount$: new BehaviorSubject(0),
    serversideTableRequestData: {
      sort$: new Subject(),
      skip$: new BehaviorSubject<number>(0),
    },
    serversideAdditionalData: {
      itemsCount$: new BehaviorSubject<number>(0),
    },
    fields: {
      order: {
        control: new FormControl()
      }
    }
  } as unknown as RackBrowserDataService;
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

describe('RackBrowserRootComponent', () => {
  let dataService: RackBrowserDataService;
  let seo: SeoAndUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => TestBed.resetTestingModule());

  function makeComp(): RackBrowserRootComponent {
    return TestBed.runInInjectionContext(() => {
      dataService = mockDataService();
      seo = mockSeo();
      return new RackBrowserRootComponent(dataService, seo);
    });
  }

  it('creates without error', () => {
    expect(() => makeComp()).not.toThrow();
  });

  it('calls updateSeo on construction', () => {
    makeComp();
    expect(seo.updateSeo).toHaveBeenCalledWith(
      jasmine.objectContaining({ description: jasmine.any(String) }),
      'Racks'
    );
  });

  it('formTypes is defined', () => {
    const comp = makeComp();
    expect(comp.formTypes).toBeDefined();
  });

  it('emits updateRacksList$ on construction', () => {
    let emitted = false;
    const ds = mockDataService();
    ds.updateRacksList$.subscribe(() => emitted = true);
    TestBed.runInInjectionContext(() => new RackBrowserRootComponent(ds, mockSeo()));
    expect(emitted).toBeTrue();
  });

  it('viewConfig is a copy of defaultRackMinimalViewConfig', () => {
    const comp = makeComp();
    expect(comp.viewConfig).toBeDefined();
    expect(comp.viewConfig.containImage).toBeDefined();
  });

  it('initialises default sort to updated descending', () => {
    const ds = mockDataService();
    const sortSpy = spyOn(ds.serversideTableRequestData.sort$, 'next').and.callThrough();
    TestBed.runInInjectionContext(() => new RackBrowserRootComponent(ds, mockSeo()));
    expect(sortSpy).toHaveBeenCalledWith(['updated', 'desc']);
    expect(ds.fields.order.control.value).toEqual({id: 'updated', name: 'Updated ↓'});
  });

  it('does NOT scroll to top when loadMore$ fires (append mode should keep scroll position)', () => {
    // regression guard: scrolling to top after a load-more hides newly appended items
    const scrollSpy = spyOn(window, 'scrollTo');
    const ds = mockDataService();
    TestBed.runInInjectionContext(() => new RackBrowserRootComponent(ds, mockSeo()));

    (ds.racksList$ as BehaviorSubject<any>).next([{id: 1}]);
    ds.loadMore$.next();
    (ds.racksList$ as BehaviorSubject<any>).next([{id: 1}, {id: 2}]);

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
