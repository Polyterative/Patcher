import { of, throwError } from 'rxjs';
import { PatchCreatorComponent } from './patch-creator.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


describe('PatchCreatorComponent', () => {
  function build(data: any = {}) {
    const dataService = {
      currentUserRacks$: jasmine.createSpy('currentUserRacks$').and.returnValue(of([])),
      createPatch$: jasmine.createSpy('createPatch$').and.returnValue(of({id: 1}))
    };
    const analytics = {
      capture: jasmine.createSpy('capture'),
      identify: () => {},
      reset: () => {}
    };
    const snackBar = {
      open: jasmine.createSpy('open').and.returnValue({
        onAction: () => of(undefined)
      })
    };
    const dialogRef = {
      close: jasmine.createSpy('close')
    };
    const component = new PatchCreatorComponent(
      snackBar as any,
      dialogRef as any,
      data,
      analytics as any,
      dataService as any
    );
    return {component, dataService, analytics, snackBar, dialogRef};
  }
  
  it('creates a patch and closes the dialog on save', () => {
    const {component, dataService, snackBar, dialogRef} = build();
    component.fields.name.control.setValue('My Patch');
    
    component.save$.next();
    
    expect(dataService.createPatch$).toHaveBeenCalledWith({name: 'My Patch', public: true});
    expect(snackBar.open).toHaveBeenCalledWith(
      '"My Patch" created and saved to your library.',
      undefined,
      {duration: 3000, panelClass: 'snack-success'}
    );
    expect(dialogRef.close).toHaveBeenCalled();
  });
  
  it('passes the selected privacy value when saving', () => {
    const {component, dataService} = build();
    component.fields.name.control.setValue('Private Patch');
    component.fields.public.control.setValue(false);
    
    component.save$.next();
    
    expect(dataService.createPatch$).toHaveBeenCalledWith({name: 'Private Patch', public: false});
  });

  it('includes linked_rack_id when a linked rack is selected', () => {
    const {component, dataService} = build();
    component.fields.name.control.setValue('Linked Patch');
    component.fields.linkedRack.control.setValue({id: '42', name: 'Studio Rack'});

    component.save$.next();

    expect(dataService.createPatch$).toHaveBeenCalledWith({
      name: 'Linked Patch',
      public: true,
      linked_rack_id: 42
    });
  });

  it('defaults new patches to public visibility', () => {
    const {component} = build();

    expect(component.fields.public.control.value).toBeTrue();
  });

  it('captures the created patch id from the data service response', () => {
    const {component, dataService, analytics} = build();
    dataService.createPatch$.and.returnValue(of({data: [{id: 73}]}));
    component.fields.name.control.setValue('Tracked Patch');

    component.save$.next();

    expect(analytics.capture).toHaveBeenCalledWith('patch.created', {patch_id: 73});
  });

  it('loads the current user racks into linked rack options on init', () => {
    const {component, dataService} = build();
    dataService.currentUserRacks$.and.returnValue(of([
      {id: 7, name: 'Studio Rack'},
      {id: 11, name: 'Travel Case'}
    ]));

    component.ngOnInit();

    expect(dataService.currentUserRacks$).toHaveBeenCalled();
    let options: { id: string; name: string }[] | undefined;
    component.linkedRackOptions$.subscribe(v => options = v).unsubscribe();
    expect(options).toEqual([
      {id: '7', name: 'Studio Rack'},
      {id: '11', name: 'Travel Case'}
    ]);
  });

  it('preselects the linked rack from dialog data when provided', () => {
    const {component, dataService} = build({linkedRackId: 11});
    dataService.currentUserRacks$.and.returnValue(of([
      {id: 7, name: 'Studio Rack'},
      {id: 11, name: 'Travel Case'}
    ]));

    component.ngOnInit();

    expect(component.fields.linkedRack.control.value).toEqual({
      id: '11',
      name: 'Travel Case'
    });
  });
  
  it('stops reacting to save after destroy', () => {
    const {component, dataService} = build();
    
    component.ngOnDestroy();
    component.save$.next();
    
    expect(dataService.createPatch$).not.toHaveBeenCalled();
  });
  
  it('initializes with a generated non-empty patch name', () => {
    const {component} = build();
    expect(component.fields.name.control.value).toEqual(jasmine.any(String));
    expect(component.fields.name.control.value.length).toBeGreaterThan(0);
  });

  it('blocks linked-rack selection when the environment cannot save linked racks yet', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {component, dataService, dialogRef} = build();
    component.fields.name.control.setValue('Linked Patch');
    component.fields.linkedRack.control.setValue({id: '42', name: 'Studio Rack'});
    dataService.createPatch$.and.returnValue(throwError(() => ({
      code: 'PGRST204',
      message: "Column 'linked_rack_id' of relation 'patches' does not exist"
    })));

    component.save$.next();

    let blocked = false;
    component.linkedRackPersistenceBlocked$.subscribe(v => blocked = v).unsubscribe();
    expect(blocked).toBeTrue();
    expect(component.fields.linkedRack.control.disabled).toBeTrue();
    expect(component.fields.linkedRack.control.value).toBe('');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
});
