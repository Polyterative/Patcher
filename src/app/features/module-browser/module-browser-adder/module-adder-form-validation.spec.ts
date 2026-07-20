import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { StandardsService } from 'src/app/components/format-translator/standards.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DBManufacturer } from 'src/app/models/manufacturer';
import { MinimalModule } from 'src/app/models/module';
import { Standard } from 'src/app/models/standard';
import { ModuleAdderDataService } from './module-adder-data.service';


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

describe('ModuleAdderDataService - Form Validation', () => {
  let createdServices: ModuleAdderDataService[];

  function build() {
    const standards$ = new BehaviorSubject<Standard[] | undefined>([]);
    const standardsService: Pick<StandardsService, 'standards'> = {
      standards: {
        update$: new Subject<void>(),
        data$:   standards$
      }
    };
    const getManufacturers = jasmine.createSpy('GET.manufacturers') as GetManufacturersSpy;
    getManufacturers.and.returnValue(of({
      data: [{id: 1, name: 'Doepfer'}]
    }));
    const getModules = jasmine.createSpy('GET.modules') as GetModulesSpy;
    getModules.and.returnValue(of({data: []}));
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
    // dialog defaults to cancelled so submission tests must override when needed
    const dialog: DialogDouble = {
      open: jasmine.createSpy('open') as DialogDouble['open']
    };
    dialog.open.and.returnValue({
      afterClosed: () => of({answer: false})
    });
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
  
  function fillRequired(service: ModuleAdderDataService) {
    service.formData.name.control.setValue('Maths');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Doepfer'});
    service.formData.hp.control.setValue('8');
    service.formData.standard.control.setValue({id: '0', name: '3U'});
    service.formData.diy.control.setValue({id: '0', name: 'Commercial'});
  }
  
  // ─── name control ────────────────────────────────────────────────────────────
  
  it('name is invalid when empty', () => {
    const {service} = build();
    service.formData.name.control.setValue('');
    expect(service.formData.name.control.valid).toBeFalse();
  });
  
  it('name is valid with a single character', () => {
    const {service} = build();
    service.formData.name.control.setValue('A');
    expect(service.formData.name.control.valid).toBeTrue();
  });
  
  it('name is valid at 144 chars', () => {
    const {service} = build();
    service.formData.name.control.setValue('A'.repeat(144));
    expect(service.formData.name.control.valid).toBeTrue();
  });
  
  it('name is invalid above 144 chars', () => {
    const {service} = build();
    service.formData.name.control.setValue('A'.repeat(145));
    expect(service.formData.name.control.valid).toBeFalse();
  });
  
  // ─── description control ─────────────────────────────────────────────────────
  
  it('description is valid when empty (not required)', () => {
    const {service} = build();
    service.formData.description.control.setValue('');
    expect(service.formData.description.control.valid).toBeTrue();
  });
  
  it('description is valid at 576 chars', () => {
    const {service} = build();
    service.formData.description.control.setValue('A'.repeat(576));
    expect(service.formData.description.control.valid).toBeTrue();
  });
  
  it('description is invalid above 576 chars', () => {
    const {service} = build();
    service.formData.description.control.setValue('A'.repeat(577));
    expect(service.formData.description.control.valid).toBeFalse();
  });
  
  // ─── hp control ──────────────────────────────────────────────────────────────
  
  it('hp is invalid when 0 (below minimum)', () => {
    const {service} = build();
    service.formData.hp.control.setValue(0);
    expect(service.formData.hp.control.valid).toBeFalse();
  });
  
  it('hp is valid at minimum (1)', () => {
    const {service} = build();
    service.formData.hp.control.setValue(1);
    expect(service.formData.hp.control.valid).toBeTrue();
  });
  
  it('hp is valid at maximum (216)', () => {
    const {service} = build();
    service.formData.hp.control.setValue(216);
    expect(service.formData.hp.control.valid).toBeTrue();
  });
  
  it('hp is invalid above maximum (217)', () => {
    const {service} = build();
    service.formData.hp.control.setValue(217);
    expect(service.formData.hp.control.valid).toBeFalse();
  });
  
  it('hp is invalid for decimal values', () => {
    const {service} = build();
    service.formData.hp.control.setValue(4.5);
    expect(service.formData.hp.control.valid).toBeFalse();
  });
  
  // ─── manual URL control ──────────────────────────────────────────────────────
  
  it('manual is valid when empty (not required)', () => {
    const {service} = build();
    service.formData.manual.control.setValue('');
    expect(service.formData.manual.control.valid).toBeTrue();
  });
  
  it('manual is invalid when URL does not include https://', () => {
    const {service} = build();
    service.formData.manual.control.setValue('http://example.com/manual');
    expect(service.formData.manual.control.valid).toBeFalse();
  });
  
  it('manual is valid with a proper https URL', () => {
    const {service} = build();
    service.formData.manual.control.setValue('https://example.com/manual.pdf');
    expect(service.formData.manual.control.valid).toBeTrue();
  });
  
  it('manual is invalid when URL exceeds 999 chars', () => {
    const {service} = build();
    service.formData.manual.control.setValue(`https://x.com/${  'a'.repeat(990)}`);
    expect(service.formData.manual.control.valid).toBeFalse();
  });
  
  // ─── formGroup validity ──────────────────────────────────────────────────────
  
  it('formGroup is valid when all required fields are set', () => {
    const {service} = build();
    fillRequired(service);
    expect(service.formGroup.valid).toBeTrue();
  });
  
  it('formGroup is invalid when name is empty', () => {
    const {service} = build();
    fillRequired(service);
    service.formData.name.control.setValue('');
    expect(service.formGroup.valid).toBeFalse();
  });
  
  it('formGroup is invalid when manufacturer is missing', () => {
    const {service} = build();
    fillRequired(service);
    service.formData.manufacturer.control.setValue('');
    expect(service.formGroup.valid).toBeFalse();
  });
  
  it('formGroup is invalid when hp is empty', () => {
    const {service} = build();
    fillRequired(service);
    service.formData.hp.control.setValue('');
    expect(service.formGroup.valid).toBeFalse();
  });
  
  // ─── submission — confirmation is handled inline (armed button) ──────────
  // The old dialog-based confirmation has been replaced by a two-stage
  // "safety cover" button in the component; data-service now submits as soon
  // as submitModuleForm$ emits.
  
  // ─── submission payload mapping ──────────────────────────────────────────────
  
  it('maps DIY option to isDIY: true in submission payload', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    service.formData.diy.control.setValue({id: '1', name: 'DIY'});
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({isDIY: true})])
    );
  });
  
  it('maps Commercial option to isDIY: false in submission payload', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    service.formData.diy.control.setValue({id: '0', name: 'Commercial'});
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({isDIY: false})])
    );
  });
  
  it('submits with isApproved: false', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({isApproved: false})])
    );
  });
  
  it('submits with public: true', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({public: true})])
    );
  });
  
  it('omits manualURL (sets to undefined) when manual field is empty', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    service.formData.manual.control.setValue('');
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({manualURL: undefined})])
    );
  });
  
  it('includes manualURL in payload when a valid https URL is provided', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    service.formData.manual.control.setValue('https://example.com/manual.pdf');
    
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({manualURL: 'https://example.com/manual.pdf'})])
    );
  });
  
  // ─── similar modules ─────────────────────────────────────────────────────────
  
  it('similarModulesData$ starts as undefined', () => {
    const {service} = build();
    expect(service.similarModulesData$.value).toBeUndefined();
  });
  
  it('triggers backend GET.modules when name changes to a non-empty value', () => {
    const {service, backend} = build();
    service.formData.name.control.setValue('Rings');
    expect(backend.GET.modules).toHaveBeenCalled();
  });
  
  it('triggers backend GET.modules when manufacturer is selected', () => {
    const {service, backend} = build();
    service.formData.manufacturer.control.setValue({id: '1', name: 'Doepfer'});
    expect(backend.GET.modules).toHaveBeenCalled();
  });
  
  it('does not call GET.modules when name is cleared and manufacturer is empty', () => {
    const {service, backend} = build();
    backend.GET.modules.calls.reset();
    
    service.formData.name.control.setValue('');
    expect(backend.GET.modules).not.toHaveBeenCalled();
  });
  
  it('still calls GET.modules when name is cleared but manufacturer remains selected', () => {
    const {service, backend} = build();
    service.formData.manufacturer.control.setValue({id: '1', name: 'Doepfer'});
    backend.GET.modules.calls.reset();
    
    service.formData.name.control.setValue('');
    expect(backend.GET.modules).toHaveBeenCalled();
  });
  
  // ─── manufacturer control stability (bug #4 regression) ─────────────────────
  
  it('manufacturer control is not disabled when options update after initial load', () => {
    const {service} = build();
    // After build(), initial manufacturers are loaded and control is enabled
    const disableSpy = spyOn(service.formData.manufacturer.control, 'disable');
    
    service.newManufacturerNameControl.setValue('NewCo');
    service.createManufacturer$.next(); // appends to _manufacturerOptions$
    
    expect(disableSpy).not.toHaveBeenCalled();
    expect(service.formData.manufacturer.control.enabled).toBeTrue();
  });

  // ─── submission pipeline resilience (bug #2 regression) ─────────────────────
  
  it('submit pipeline survives a backend error and accepts a subsequent submission', () => {
    const {service, backend, dialog} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    
    // first attempt — backend fails
    backend.add.modules.and.returnValue(throwError(() => new Error('network')));
    service.submitModuleForm$.next();
    
    // pipeline must still be alive — second attempt succeeds
    backend.add.modules.and.returnValue(of({data: [{id: 111}]}));
    service.submitModuleForm$.next();
    
    expect(backend.add.modules).toHaveBeenCalledTimes(2);
  });
  
  it('shows error snackbar when module submission fails', () => {
    const {service, backend, dialog, snackBar} = build();
    dialog.open.and.returnValue({afterClosed: () => of({answer: true})});
    fillRequired(service);
    
    backend.add.modules.and.returnValue(throwError(() => new Error('network')));
    service.submitModuleForm$.next();
    
    expect(snackBar.open).toHaveBeenCalled();
  });
});