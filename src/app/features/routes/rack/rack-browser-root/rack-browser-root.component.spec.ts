import { RackBrowserRootComponent } from './rack-browser-root.component';
import { RackBrowserDataService } from 'src/app/features/routes/rack/rack-browser-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';

function mockDataService(): RackBrowserDataService {
  return {
    paginatorToFistPage$: new Subject<void>(),
    pageEvent$: new Subject<void>(),
    racksList$: new BehaviorSubject(null),
    updateRacksList$: new Subject<void>(),
    serversideTableRequestData: { sort$: new Subject() },
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
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: document }
      ]
    });
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
});
