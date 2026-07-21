import { RackBrowserRootComponent } from './rack-browser-root.component';
import {
  RackBrowserDataService,
  RackList,
  RackOrderOption
} from 'src/app/features/routes/rack/rack-browser-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { RackMinimal } from 'src/app/models/rack';

type RackBrowserDataServiceDouble = Pick<RackBrowserDataService,
  'loadMore$' | 'racksList$' | 'updateRacksList$' | 'hasMoreRacks$' | 'remainingRacksCount$'
> & {
  serversideTableRequestData: Pick<RackBrowserDataService['serversideTableRequestData'], 'sort$' | 'skip$'>;
  serversideAdditionalData: Pick<RackBrowserDataService['serversideAdditionalData'], 'itemsCount$'>;
  fields: {
    order: Pick<RackBrowserDataService['fields']['order'], 'control'>;
  };
};

interface SeoAndUtilsServiceDouble extends Pick<SeoAndUtilsService, 'updateSeo'> {
  updateSeo: jasmine.Spy<SeoAndUtilsService['updateSeo']>;
}

function rackFactory(id: number, name = `Rack ${ id }`): RackMinimal {
  return {
    id,
    name,
    hp: 104,
    rows: 2,
    author: {id: 'user-1', username: 'patcher'},
    locked: false,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z'
  };
}

function mockDataService(): RackBrowserDataServiceDouble {
  return {
    loadMore$: new Subject<void>(),
    racksList$: new BehaviorSubject<RackList>(null),
    updateRacksList$: new Subject<void>(),
    hasMoreRacks$: new BehaviorSubject(false),
    remainingRacksCount$: new BehaviorSubject(0),
    serversideTableRequestData: {
      sort$: new BehaviorSubject<[string, string]>(['updated', 'desc']),
      skip$: new BehaviorSubject<number>(0),
    },
    serversideAdditionalData: {
      itemsCount$: new BehaviorSubject<number>(0),
    },
    fields: {
      order: {
        control: new FormControl<RackOrderOption>({id: 'updated', name: 'Updated ↓'}, {nonNullable: true})
      }
    }
  };
}

function mockSeo(): SeoAndUtilsServiceDouble {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  };
}

describe('RackBrowserRootComponent', () => {
  let dataService: RackBrowserDataServiceDouble;
  let seo: SeoAndUtilsServiceDouble;

  afterEach(() => TestBed.resetTestingModule());

  function makeCompWith(
    dataServiceDouble: RackBrowserDataServiceDouble,
    seoDouble: SeoAndUtilsServiceDouble
  ): RackBrowserRootComponent {
    TestBed.configureTestingModule({
      providers: [
        {provide: RackBrowserDataService, useValue: dataServiceDouble},
        {provide: SeoAndUtilsService, useValue: seoDouble}
      ]
    });

    return TestBed.runInInjectionContext(() => {
      return new RackBrowserRootComponent(
        TestBed.inject(RackBrowserDataService),
        TestBed.inject(SeoAndUtilsService)
      );
    });
  }

  function makeComp(): RackBrowserRootComponent {
    dataService = mockDataService();
    seo = mockSeo();
    return makeCompWith(dataService, seo);
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
    makeCompWith(ds, mockSeo());
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
    makeCompWith(ds, mockSeo());
    expect(sortSpy).toHaveBeenCalledWith(['updated', 'desc']);
    expect(ds.fields.order.control.value).toEqual({id: 'updated', name: 'Updated ↓'});
  });

  it('does NOT scroll to top when loadMore$ fires (append mode should keep scroll position)', () => {
    // regression guard: scrolling to top after a load-more hides newly appended items
    const scrollSpy = spyOn(window, 'scrollTo');
    const ds = mockDataService();
    makeCompWith(ds, mockSeo());

    ds.racksList$.next([rackFactory(1)]);
    ds.loadMore$.next();
    ds.racksList$.next([rackFactory(1), rackFactory(2)]);

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
