import {
  BehaviorSubject,
  of,
  throwError
} from 'rxjs';
import { ModuleAdderDataService } from './module-adder-data.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


describe('ModuleAdderDataService', () => {
  function build(options?: {
    manufacturers?: { id: number; name: string }[];
    modules?: { id: number; name: string }[];
  }) {
    const standards$ = new BehaviorSubject<any[]>([]);
    const manufacturers = options?.manufacturers ?? [{id: 1, name: 'Make Noise'}];
    const modules = options?.modules ?? [{id: 12, name: 'Maths'}];
    const backend = {
      GET: {
        manufacturers: jasmine.createSpy('GET.manufacturers').and.returnValue(of({
          data: manufacturers
        })),
        modules: jasmine.createSpy('GET.modules').and.returnValue(of({
          data: modules
        }))
      },
      add: {
        modules: jasmine.createSpy('add.modules').and.returnValue(of({data: [{id: 111}]})),
        manufacturers: jasmine.createSpy('add.manufacturers').and.returnValue(of({data: [{id: 55, name: 'NewCo'}]}))
      },
      cacheResetter$: {next: jasmine.createSpy('cacheResetter$.next')}
    };
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    
    const service = new ModuleAdderDataService(
      {standards: {data$: standards$.asObservable()}} as any,
      backend as any,
      dialog as any,
      snackBar,
      router
    );
    
    return {service, standards$, backend, dialog, snackBar, router};
  }
  
  it('loads manufacturer options and enables control after data arrives', () => {
    const {service, backend, standards$} = build();
    expect(backend.GET.manufacturers).toHaveBeenCalled();
    expect(backend.cacheResetter$.next).toHaveBeenCalledWith(['manufacturers']);
    expect(service.formData.manufacturer.control.enabled).toBeTrue();
    
    standards$.next([{id: 0, name: '3U'}] as any);
    expect(service.formData.standard.control.value).toEqual({id: '0', name: '3U'} as any);
  });
  
  it('updates similar module list when name/manufacturer changes', () => {
    const {service, backend} = build();
    service.formData.name.control.setValue('Maths');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});
    
    expect(backend.GET.modules).toHaveBeenCalled();
    expect(service.similarModulesData$.value).toEqual([{id: 12, name: 'Maths'}] as any);
  });

  it('detects duplicate manufacturer names accent-insensitively', () => {
    const {service} = build({
      manufacturers: [{id: 1, name: 'Instruō'}]
    });

    service.newManufacturerNameControl.setValue('Instruo');

    expect(service.duplicateManufacturer$.value).toEqual({id: '1', name: 'Instruō'} as any);
  });

  it('shows accent-matched similar modules on the submit-module page', () => {
    const {service} = build({
      modules: [{id: 2075, name: 'Lùbadh'}]
    });

    service.formData.name.control.setValue('Lubadh');

    expect(service.similarModulesData$.value).toEqual([{id: 2075, name: 'Lùbadh'}] as any);
  });
  
  it('submits module after confirmation and resets form fields', () => {
    const {service, backend, snackBar, router, dialog} = build();
    service.formData.name.control.setValue('Sample');
    service.formData.description.control.setValue('Desc');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});
    service.formData.hp.control.setValue('8');
    service.formData.standard.control.setValue({id: '0', name: '3U'});
    service.formData.manual.control.setValue('https://manual');
    service.formData.diy.control.setValue({id: '0', name: 'Commercial'});
    
    service.submitModuleForm$.next();
    
    expect(dialog.open).toHaveBeenCalled();
    expect(backend.add.modules).toHaveBeenCalled();
    expect(service.formData.name.control.value).toBe('');
    expect(service.formData.description.control.value).toBe('');
    expect(service.formData.manual.control.value).toBe('');
    expect(service.formData.hp.control.value).toBe('');
    expect(snackBar.open).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/modules', 'browser'],
      jasmine.objectContaining({queryParams: {refresh: true}})
    );
  });
  
  it('creates manufacturer inline and selects the new option', () => {
    const {service, backend} = build();
    service.showNewManufacturerForm$.next(true);
    service.newManufacturerNameControl.setValue('NewCo');
    
    service.createManufacturer$.next();
    
    expect(backend.add.manufacturers).toHaveBeenCalled();
    expect(service.formData.manufacturer.control.value).toEqual({id: '55', name: 'NewCo'} as any);
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
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    backend.add.manufacturers.and.returnValue(throwError(() => new Error('network')));
    service.newManufacturerNameControl.setValue('Broken');

    service.createManufacturer$.next();

    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(service.isCreatingManufacturer$.value).toBeFalse();
  });

  it('formGroup is valid when all fields are filled', () => {
    const {service, standards$} = build();

    // standard control is auto-applied by the options$ subscription
    standards$.next([{id: 0, name: '3U'}] as any);

    service.formData.name.control.setValue('Maths');
    service.formData.description.control.setValue('Analog computer designed for musical purposes');
    service.formData.manufacturer.control.setValue({id: '1', name: 'Make Noise'});
    service.formData.hp.control.setValue('20');
    service.formData.manual.control.setValue('https://make-noise.com/manual.pdf');
    service.formData.diy.control.setValue({id: '0', name: 'Commercial'});

    expect(service.formGroup.valid).toBeTrue();
  });
});
