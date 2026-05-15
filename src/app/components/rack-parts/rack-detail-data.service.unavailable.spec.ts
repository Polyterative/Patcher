import {
  BehaviorSubject,
  of
} from 'rxjs';
import { RackDetailDataService } from './rack-detail-data.service';


/**
 * Regression specs for the "private rack opens to a blank page" bug.
 *
 * Symptom: when the detail fetch returns `{data: null}` (e.g. an anonymous viewer
 * hits a private rack URL and RLS blocks the row), the data service silently sets
 * `singleRackData$` to undefined and never surfaces a user-visible signal that the
 * rack is unavailable. The template, lacking an empty-state branch, renders nothing.
 *
 * Fix contract (mirrors the existing patch flow, see `patchDetailUnavailableMessage$`):
 * the rack detail data service must expose an `unavailable` observable that gets
 * populated with a non-empty user-readable message when a lookup yields no row,
 * and gets cleared when a subsequent lookup is started.
 *
 * Until the fix lands these tests fail — that is intentional and is what catches
 * the bug.
 */
describe('RackDetailDataService — unavailable / blank-page regression', () => {
  let createdServices: RackDetailDataService[];

  function rack(partial: any = {}) {
    return {
      id: 1,
      name: 'Rack',
      rows: 2,
      hp: 84,
      public: true,
      locked: false,
      author: {id: 'u1', username: 'user'},
      ...partial
    } as any;
  }

  function build(options: {firstResponse?: any} = {}) {
    const loggedUser$ = new BehaviorSubject<any>(undefined);

    const firstResponse = 'firstResponse' in options
      ? options.firstResponse
      : {data: null};

    const backend = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({data: [{id: 1}]})),
        rackedModules: jasmine.createSpy('update.rackedModules').and.returnValue(of({})),
        rackModulePanel: jasmine.createSpy('update.rackModulePanel').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('delete.modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('delete.commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('delete.userRack').and.returnValue(of({}))
      },
      add: {
        rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({})),
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 99}]})),
        patch: jasmine.createSpy('add.patch').and.returnValue(of({data: [{id: 321}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of(firstResponse)),
        publicRackWithId: jasmine.createSpy('GET.publicRackWithId').and.returnValue(of(firstResponse))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('img.jpg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      }
    };
    const dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: false})
      })
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj('Router', ['navigate']);

    const service = new RackDetailDataService(
      snackBar,
      {loggedUser$} as any,
      backend as any,
      dialog as any,
      router
    );
    createdServices.push(service);

    return {service, backend};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach(s => s.ngOnDestroy());
  });

  it('exposes a rackDetailUnavailableMessage$ observable (mirrors patchDetailUnavailableMessage$)', () => {
    const {service} = build();

    // Cast to any so the spec compiles before the fix lands; the test still
    // fails meaningfully at runtime until the property exists.
    const unavailable$ = (service as any).rackDetailUnavailableMessage$;

    expect(unavailable$)
      .withContext('RackDetailDataService should expose rackDetailUnavailableMessage$ ' +
        'so the template can render a friendly empty state instead of a blank page')
      .toBeDefined();
    expect(typeof unavailable$?.subscribe)
      .withContext('rackDetailUnavailableMessage$ should be a BehaviorSubject/Observable')
      .toBe('function');
  });

  it('populates rackDetailUnavailableMessage$ with a user-readable string when the lookup returns null', () => {
    const {service} = build({firstResponse: {data: null}});

    service.updateSingleRackData$.next(1018);

    const unavailable$ = (service as any).rackDetailUnavailableMessage$;
    const value: unknown = unavailable$?.value;

    expect(value)
      .withContext('A null fetch result must produce a non-null unavailable message ' +
        '(otherwise the template renders blank — this is the bug).')
      .not.toBeNull();
    expect(value)
      .withContext('Unavailable message must not be undefined either')
      .not.toBeUndefined();
    expect(typeof value).toBe('string');
    expect((value as string).length)
      .withContext('Unavailable message should be human readable, not an empty string')
      .toBeGreaterThan(0);
  });

  it('clears rackDetailUnavailableMessage$ when a new fetch begins', () => {
    const {service, backend} = build({firstResponse: {data: null}});

    service.updateSingleRackData$.next(1018);

    const unavailable$ = (service as any).rackDetailUnavailableMessage$;
    expect(unavailable$?.value).withContext('precondition: message is set after a null fetch').toBeTruthy();

    // Next fetch succeeds — the stale "unavailable" must be cleared at request time
    // so the UI doesn't briefly show an error while the new request is in flight.
    backend.GET.publicRackWithId.and.returnValue(of({data: rack({id: 2})}));
    backend.GET.rackWithId.and.returnValue(of({data: rack({id: 2})}));
    service.updateSingleRackData$.next(2);

    expect(unavailable$?.value)
      .withContext('Starting a new fetch must reset rackDetailUnavailableMessage$ to null')
      .toBeNull();
  });

  it('keeps singleRackData$ undefined when the lookup returns null (this part is already correct — guard against regression)', () => {
    const {service} = build({firstResponse: {data: null}});

    service.updateSingleRackData$.next(9999999);

    expect(service.singleRackData$.value).toBeUndefined();
  });
});
