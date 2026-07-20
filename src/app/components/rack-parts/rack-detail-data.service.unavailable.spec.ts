import {
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import {
  SimpleUserModel,
  SupabaseService
} from '../../features/backend/supabase.service';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { Rack } from '../../models/rack';
import { RackDetailDataService } from './rack-detail-data.service';

type RackLookupResponse = {data: Rack | null};
type EmptyResponse = Record<string, never>;

interface BackendDouble {
  update: {
    rack: jasmine.Spy<(rack: Rack) => Observable<{data: Array<{id: number}>}>>;
    rackedModules: jasmine.Spy<() => Observable<EmptyResponse>>;
    rackModulePanel: jasmine.Spy<() => Observable<EmptyResponse>>;
  };
  delete: {
    rackedModule: jasmine.Spy<() => Observable<EmptyResponse>>;
    modulesOfRack: jasmine.Spy<() => Observable<EmptyResponse>>;
    commentsForRack: jasmine.Spy<() => Observable<EmptyResponse>>;
    userRack: jasmine.Spy<() => Observable<EmptyResponse>>;
  };
  add: {
    rackModule: jasmine.Spy<() => Observable<EmptyResponse>>;
    rack: jasmine.Spy<() => Observable<{data: Array<{id: number}>}>>;
    patch: jasmine.Spy<() => Observable<{data: Array<{id: number}>}>>;
  };
  get: {
    rackedModules: jasmine.Spy<() => Observable<unknown[]>>;
  };
  GET: {
    rackWithId: jasmine.Spy<(rackId: number) => Observable<RackLookupResponse>>;
    publicRackWithId: jasmine.Spy<(rackId: number) => Observable<RackLookupResponse>>;
  };
  storage: {
    uploadRackImage: jasmine.Spy<() => Observable<string>>;
    deleteRackImage: jasmine.Spy<() => Observable<EmptyResponse>>;
  };
  auth: {
    hasAdminRole$: jasmine.Spy<() => Observable<boolean>>;
  };
}

interface Harness {
  service: RackDetailDataService;
  backend: BackendDouble;
}

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

  function rack(partial: Partial<Rack> = {}): Rack {
    return {
      id: 1,
      name: 'Rack',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      rows: 2,
      hp: 84,
      public: true,
      locked: false,
      author: {id: 'u1', username: 'user'},
      ...partial
    };
  }

  function build(options: {firstResponse?: RackLookupResponse} = {}): Harness {
    const loggedUser$ = new BehaviorSubject<SimpleUserModel | undefined>(undefined);

    const firstResponse = 'firstResponse' in options
      ? options.firstResponse
      : {data: null};

    const backend: BackendDouble = {
      update: {
        rack: jasmine.createSpy<(rackToUpdate: Rack) => Observable<{data: Array<{id: number}>}>>('update.rack')
          .and.returnValue(of({data: [{id: 1}]})),
        rackedModules: jasmine.createSpy<() => Observable<EmptyResponse>>('update.rackedModules').and.returnValue(of({})),
        rackModulePanel: jasmine.createSpy<() => Observable<EmptyResponse>>('update.rackModulePanel').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy<() => Observable<EmptyResponse>>('delete.rackedModule').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy<() => Observable<EmptyResponse>>('delete.modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy<() => Observable<EmptyResponse>>('delete.commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy<() => Observable<EmptyResponse>>('delete.userRack').and.returnValue(of({}))
      },
      add: {
        rackModule: jasmine.createSpy<() => Observable<EmptyResponse>>('add.rackModule').and.returnValue(of({})),
        rack: jasmine.createSpy<() => Observable<{data: Array<{id: number}>}>>('add.rack')
          .and.returnValue(of({data: [{id: 99}]})),
        patch: jasmine.createSpy<() => Observable<{data: Array<{id: number}>}>>('add.patch')
          .and.returnValue(of({data: [{id: 321}]}))
      },
      get: {
        rackedModules: jasmine.createSpy<() => Observable<unknown[]>>('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy<(rackId: number) => Observable<RackLookupResponse>>('GET.rackWithId')
          .and.returnValue(of(firstResponse)),
        publicRackWithId: jasmine.createSpy<(rackId: number) => Observable<RackLookupResponse>>('GET.publicRackWithId')
          .and.returnValue(of(firstResponse))
      },
      storage: {
        uploadRackImage: jasmine.createSpy<() => Observable<string>>('storage.uploadRackImage').and.returnValue(of('img.jpg')),
        deleteRackImage: jasmine.createSpy<() => Observable<EmptyResponse>>('storage.deleteRackImage').and.returnValue(of({}))
      },
      auth: {
        hasAdminRole$: jasmine.createSpy<() => Observable<boolean>>('auth.hasAdminRole$').and.returnValue(of(false))
      }
    };
    const confirmDialogRef = {
      afterClosed: () => of({answer: false})
    } as MatDialogRef<unknown, {answer: boolean}>;
    const dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue(confirmDialogRef)
    };
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
    const userService: Pick<UserManagementService, 'loggedUser$'> = {loggedUser$};

    const service = new RackDetailDataService(
      snackBar,
      userService as unknown as UserManagementService,
      backend as unknown as SupabaseService,
      dialog as unknown as MatDialog,
      router,
      analytics
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

    const unavailable$ = service.rackDetailUnavailableMessage$;

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

    const unavailable$ = service.rackDetailUnavailableMessage$;
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

    const unavailable$ = service.rackDetailUnavailableMessage$;
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
