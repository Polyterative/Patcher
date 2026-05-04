import { of } from 'rxjs';
import { PatchCreatorComponent } from './patch-creator.component';


describe('PatchCreatorComponent', () => {
  function build() {
    const backend = {
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
      {}
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

  it('defaults new patches to public visibility', () => {
    const {component} = build();

    expect(component.fields.public.control.value).toBeTrue();
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
