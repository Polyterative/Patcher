import {
  FormControl,
  Validators
} from '@angular/forms';
import { FormTypes } from '../../components/@smart/mat-form-entity/form-element-models';
import { InputDialogComponent } from './input-dialog.component';


describe('InputDialogComponent', () => {
  it('updates validity stream when form control value changes', () => {
    const control = new FormControl('', [Validators.required]);
    const component = new InputDialogComponent(
      {} as any,
      {
        title: 'Rename',
        control,
        type: FormTypes.TEXT,
        label: 'Name'
      } as any,
      {} as any
    );
    
    expect(component.isValid$.value).toBeFalse();
    
    control.setValue('valid');
    expect(component.isValid$.value).toBeTrue();
    
    control.setValue('');
    expect(component.isValid$.value).toBeFalse();
  });
  
  it('stops reacting to changes after destroy', () => {
    const control = new FormControl('', [Validators.required]);
    const component = new InputDialogComponent(
      {} as any,
      {
        title: 'Rename',
        control,
        type: FormTypes.TEXT,
        label: 'Name'
      } as any,
      {} as any
    );
    
    control.setValue('valid');
    expect(component.isValid$.value).toBeTrue();
    
    component.ngOnDestroy();
    control.setValue('');
    
    expect(component.isValid$.value).toBeTrue();
  });

  it('confirms only when the control is valid', () => {
    const control = new FormControl('', [Validators.required]);
    const closeSpy = jasmine.createSpy('close');
    const component = new InputDialogComponent(
      {
        close: closeSpy
      } as any,
      {
        title: 'Rename',
        control,
        type: FormTypes.TEXT,
        label: 'Name'
      } as any,
      {} as any
    );

    component.confirm();
    expect(closeSpy).not.toHaveBeenCalled();

    control.setValue('valid');
    component.confirm();
    expect(closeSpy).toHaveBeenCalledWith({result: 'valid'});
  });
});
