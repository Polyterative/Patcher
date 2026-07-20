import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { ModuleAdderDataService } from './module-adder-data.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Standard } from 'src/app/models/standard';
import { MinimalModule } from 'src/app/models/module';
import { DBManufacturer } from 'src/app/models/manufacturer';
import { StandardsService } from 'src/app/components/format-translator/standards.service';
import { SupabaseService } from '../../backend/supabase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';


type ManufacturerFixture = Pick<DBManufacturer, 'id' | 'name'>;
type CreatedModuleFixture = { id: number };
type NewModulePayload = readonly Record<string, unknown>[];
type NewManufacturerPayload = readonly Pick<DBManufacturer, 'name'>[];
type BackendResult<T> = { data: T[] };
type GetModulesArgs = Parameters<SupabaseService['GET']['modules']>;
type GetModulesSpy = jasmine.Spy<(...args: GetModulesArgs) => Observable<BackendResult<MinimalModule>>>;
type GetManufacturersSpy = jasmine.Spy<(
  from?: number,
  to?: number,
  columns?: string,
  orderBy?: string
) => Observable<BackendResult<ManufacturerFixture>>>;
type AddModulesSpy = jasmine.Spy<(data: NewModulePayload) => Observable<BackendResult<CreatedModuleFixture>>>;
type AddManufacturersSpy = jasmine.Spy<(data: NewManufacturerPayload) => Observable<BackendResult<ManufacturerFixture>>>;

interface BackendDouble {
  GET: {
    manufacturers: GetManufacturersSpy;
    modules: GetModulesSpy;
  };
  add: {
    modules: AddModulesSpy;
    manufacturers: AddManufacturersSpy;
  };
  cacheResetter$: {
    next: jasmine.Spy<(keys: string[]) => void>;
  };
}

interface DialogDouble {
  open: jasmine.Spy<() => { afterClosed: () => Observable<{ answer: boolean }> }>;
}

const standard3U: Standard = {id: 0, name: '3U'};
const defaultManufacturer: ManufacturerFixture = {id: 1, name: 'Make Noise'};

function moduleFixture(overrides: Pick<MinimalModule, 'id' | 'name'> & Partial<MinimalModule>): MinimalModule {
  return {
    id:             overrides.id,
    name:           overrides.name,
    description:    '',
    hp:             8,
    public:         true,
    manufacturer:   defaultManufacturer,
    manufacturerId: defaultManufacturer.id,
    standard:       standard3U,
    tags:           [],
    panels:         [],
    created:        '2026-07-20T00:00:00.000Z',
    updated:        '2026-07-20T00:00:00.000Z',
    ...overrides
  };
}


describe('ModuleAdderDataService', () => {
  let createdServices: ModuleAdderDataService[];

  function build(options?: {
    manufacturers?: ManufacturerFixture[];
    modules?: MinimalModule[];
  }) {
    const standards$ = new BehaviorSubject<Standard[] | undefined>([]);
    const standardsService: Pick<StandardsService, 'standards'> = {
      standards: {
        update$: new Subject<void>(),
        data$:   standards$
      }
    };
    const manufacturers = options?.manufacturers ?? [defaultManufacturer];
    const modules = options?.modules ?? [moduleFixture({id: 12, name: 'Maths'})];
    const getManufacturers = jasmine.createSpy('GET.manufacturers') as GetManufacturersSpy;
    getManufacturers.and.returnValue(of({data: manufacturers}));
    const getModules = jasmine.createSpy('GET.modules') as GetModulesSpy;
    getModules.and.returnValue(of({data: modules}));
    const addModules = jasmine.createSpy('add.modules') as AddModulesSpy;
    addModules.and.returnValue(of({data: [{id: 111}]}));
    const addManufacturers = jasmine.createSpy('add.manufacturers') as AddManufacturersSpy;
    addManufacturers.and.returnValue(of({data: [{id: 55, name: 'NewCo'}]}));
    const backend: BackendDouble = {
      GET: {
        manufacturers: getManufacturers,
        modules: getModules
      },
      add: {
        modules: addModules,
        manufacturers: addManufacturers
      },
      cacheResetter$: {next: jasmine.createSpy('cacheResetter$.next')}
    };
    const dialog: DialogDouble = {
      open: jasmine.createSpy('open') as DialogDouble['open']
    };
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
    
    const service = new ModuleAdderDataService(
      standardsService as ConstructorParameters<typeof ModuleAdderDataService>[0],
      backend as unknown as ConstructorParameters<typeof ModuleAdderDataService>[1],
      dialog as unknown as ConstructorParameters<typeof ModuleAdderDataService>[2],
      snackBar,
      router,
      analytics
    );
    createdServices.push(service);
    
    return {service, standards$, backend, dialog, snackBar, router};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });
  
  it('loads manufacturer options and enables control after data arrives', () => {
    const {service, backend, standards$} = build();
    expect(backend.GET.manufacturers).toHaveBeenCalled();
    expect(backend.cacheResetter$.next).toHaveBeenCalledWith(['manufacturers']);
    expect(service.formData.manufacturer.control.enabled).toBeTrue();
    
    standards$.next([standard3U]);
    expect(service.formData.standard.control.value).toEqual({id: '0', name: '3U'});
  });
  
  it('updates similar module list when name/manufacturer changes', () => {
    const {service, backend} = build();
    service.formData.name.control.setValue('Maths');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});
    
    expect(backend.GET.modules).toHaveBeenCalled();
    expect(service.similarModulesData$.value).toEqual([moduleFixture({id: 12, name: 'Maths'})]);
  });

  it('shows a loading state while submit-module similar search is pending', () => {
    const {service, backend} = build();
    const previousModule = moduleFixture({id: 1, name: 'Previous'});
    const ringsModule = moduleFixture({id: 2, name: 'Rings'});
    const response$ = new Subject<BackendResult<MinimalModule>>();
    backend.GET.modules.and.returnValue(response$.asObservable());
    service.similarModulesData$.next([previousModule]);

    service.formData.name.control.setValue('Rings');

    expect(service.similarModulesData$.value).toBeUndefined();
    response$.next({data: [ringsModule]});
    response$.complete();
    expect(service.similarModulesData$.value).toEqual([ringsModule]);
  });

  it('supports manufacturer-only similar search for empty-state discovery', () => {
    const {service, backend} = build({modules: []});

    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});

    const args = backend.GET.modules.calls.mostRecent().args;
    expect(args[2]).toBe('');
    expect(args[5]).toBe(1);
    expect(args[10]).toBeFalse();
    expect(service.similarModulesData$.value).toEqual([]);
  });

  it('clears similar search results to an empty list when no matches are found', () => {
    const {service} = build({modules: []});

    service.formData.name.control.setValue('No Exact Match');

    expect(service.similarModulesData$.value).toEqual([]);
  });

  it('keeps submit-module similar search working after a backend error', () => {
    const {service, backend} = build();
    spyOn(console, 'error');
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    backend.GET.modules.and.returnValues(
      throwError(() => new Error('network')),
      of({data: [moduleFixture({id: 42, name: 'Recovered'})]})
    );

    service.formData.name.control.setValue('Broken');
    expect(service.similarModulesData$.value).toEqual([]);
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Failed to search similar modules');

    service.formData.name.control.setValue('Recovered');
    expect(service.similarModulesData$.value).toEqual([moduleFixture({id: 42, name: 'Recovered'})]);
    expect(console.error).toHaveBeenCalledWith('Failed to search similar modules:', jasmine.any(Error));
  });

  it('detects duplicate manufacturer names accent-insensitively', () => {
    const {service} = build({
      manufacturers: [{id: 1, name: 'Instruō'}]
    });

    service.newManufacturerNameControl.setValue('Instruo');

    expect(service.duplicateManufacturer$.value).toEqual({id: '1', name: 'Instruō'});
  });

  it('shows accent-matched similar modules on the submit-module page', () => {
    const lubadhModule = moduleFixture({id: 2075, name: 'Lùbadh'});
    const {service} = build({
      modules: [lubadhModule]
    });

    service.formData.name.control.setValue('Lubadh');

    expect(service.similarModulesData$.value).toEqual([lubadhModule]);
  });
  
  it('submits module immediately and resets form fields', fakeAsync(() => {
    const {service, backend, router} = build();
    service.formData.name.control.setValue('Sample');
    service.formData.description.control.setValue('Desc');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});
    service.formData.hp.control.setValue('8');
    service.formData.standard.control.setValue({id: '0', name: '3U'});
    service.formData.manual.control.setValue('https://manual');
    service.formData.diy.control.setValue({id: '0', name: 'Commercial'});
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalled();
    expect(service.formData.name.control.value).toBe('');
    expect(service.formData.description.control.value).toBe('');
    expect(service.formData.manual.control.value).toBe('');
    expect(service.formData.hp.control.value).toBe('');
    
    // navigation is delayed by the celebration animation
    tick(4000);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/modules', 'browser'],
      jasmine.objectContaining({queryParams: {refresh: true}})
    );
  }));
  
  it('creates manufacturer inline and selects the new option', () => {
    const {service, backend} = build();
    service.showNewManufacturerForm$.next(true);
    service.newManufacturerNameControl.setValue('NewCo');
    
    service.createManufacturer$.next();
    
    expect(backend.add.manufacturers).toHaveBeenCalled();
    expect(service.formData.manufacturer.control.value).toEqual({id: '55', name: 'NewCo'});
    expect(service.newManufacturerNameControl.value).toBe('');
    expect(service.showNewManufacturerForm$.value).toBeFalse();
  });
  
  it('shows error message when create-manufacturer response has no created row', () => {
    const {service, backend} = build();
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    backend.add.manufacturers.and.returnValue(of({data: []}));
    service.newManufacturerNameControl.setValue('Missing');
    
    service.createManufacturer$.next();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Failed to create manufacturer');
  });
  
  it('handles manufacturer-create backend error', () => {
    const {service, backend} = build();
    spyOn(console, 'error');
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    backend.add.manufacturers.and.returnValue(throwError(() => new Error('network')));
    service.newManufacturerNameControl.setValue('Broken');

    service.createManufacturer$.next();

    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(service.isCreatingManufacturer$.value).toBeFalse();
    expect(console.error).toHaveBeenCalledWith('Failed to create manufacturer:', jasmine.any(Error));
  });

  it('formGroup is valid when all fields are filled', () => {
    const {service, standards$} = build();

    // standard control is auto-applied by the options$ subscription
    standards$.next([standard3U]);

    service.formData.name.control.setValue('Maths');
    service.formData.description.control.setValue('Analog computer designed for musical purposes');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});
    service.formData.hp.control.setValue('20');
    service.formData.manual.control.setValue('https://make-noise.com/manual.pdf');
    service.formData.diy.control.setValue({id: '0', name: 'Commercial'});

    expect(service.formGroup.valid).toBeTrue();
  });

  it('similarModulesData$ starts as undefined', () => {
    const {service} = build();
    expect(service.similarModulesData$.value).toBeUndefined();
    service.ngOnDestroy();
  });

  it('isCreatingManufacturer$ starts as false', () => {
    const {service} = build();
    expect(service.isCreatingManufacturer$.value).toBeFalse();
    service.ngOnDestroy();
  });

  it('newManufacturerNameControl starts empty', () => {
    const {service} = build();
    expect(service.newManufacturerNameControl.value).toBe('');
    service.ngOnDestroy();
  });
});
