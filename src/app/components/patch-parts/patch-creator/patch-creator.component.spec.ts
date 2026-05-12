import { of } from 'rxjs';
import { PatchCreatorComponent } from './patch-creator.component';


describe('PatchCreatorComponent', () => {
  function build(data: any = {}) {
    const backend = {
      get: {
        currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([]))
      },
      add: {
        patch: jasmine.createSpy('patch').and.returnValue(of({id: 1}))
      }
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
      backend as any,
      dialogRef as any,
      data
    );
    return {component, backend, snackBar, dialogRef};
  }
  
  it('creates a patch and closes the dialog on save', () => {
    const {component, backend, snackBar, dialogRef} = build();
    component.fields.name.control.setValue('My Patch');
    
    component.save$.next();
    
    expect(backend.add.patch).toHaveBeenCalledWith({name: 'My Patch', public: true});
    expect(snackBar.open).toHaveBeenCalledWith(
      '"My Patch" created and saved to your library.',
      undefined,
      {duration: 3000, panelClass: 'snack-success'}
    );
    expect(dialogRef.close).toHaveBeenCalled();
  });
  
  it('passes the selected privacy value when saving', () => {
    const {component, backend} = build();
    component.fields.name.control.setValue('Private Patch');
    component.fields.public.control.setValue(false);
    
    component.save$.next();
    
    expect(backend.add.patch).toHaveBeenCalledWith({name: 'Private Patch', public: false});
  });

  it('includes linked_rack_id when a linked rack is selected', () => {
    const {component, backend} = build();
    component.fields.name.control.setValue('Linked Patch');
    component.fields.linkedRack.control.setValue({id: '42', name: 'Studio Rack'});

    component.save$.next();

    expect(backend.add.patch).toHaveBeenCalledWith({
      name: 'Linked Patch',
      public: true,
      linked_rack_id: 42
    });
  });

  it('defaults new patches to public visibility', () => {
    const {component} = build();

    expect(component.fields.public.control.value).toBeTrue();
  });

  it('loads the current user racks into linked rack options on init', () => {
    const {component, backend} = build();
    backend.get.currentUserRacks.and.returnValue(of([
      {id: 7, name: 'Studio Rack'},
      {id: 11, name: 'Travel Case'}
    ]));

    component.ngOnInit();

    expect(backend.get.currentUserRacks).toHaveBeenCalled();
    expect(component.linkedRackOptions$.value).toEqual([
      {id: '7', name: 'Studio Rack'},
      {id: '11', name: 'Travel Case'}
    ]);
  });

  it('preselects the linked rack from dialog data when provided', () => {
    const {component, backend} = build({linkedRackId: 11});
    backend.get.currentUserRacks.and.returnValue(of([
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
    const {component, backend} = build();
    
    component.ngOnDestroy();
    component.save$.next();
    
    expect(backend.add.patch).not.toHaveBeenCalled();
  });
  
  it('initializes with a generated non-empty patch name', () => {
    const {component} = build();
    expect(component.fields.name.control.value).toEqual(jasmine.any(String));
    expect(component.fields.name.control.value.length).toBeGreaterThan(0);
  });
});
