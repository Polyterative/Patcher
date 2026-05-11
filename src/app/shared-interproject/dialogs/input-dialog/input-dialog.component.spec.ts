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

  it('builds a shared field config with default done ergonomics', () => {
    const control = new FormControl('');
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

    expect(component.fieldConfig.control).toBe(control);
    expect(component.fieldConfig.ergonomics).toEqual({
      autofocus: true,
      enterkeyhint: 'done'
    });
  });

  it('lets callers override shared dialog ergonomics', () => {
    const control = new FormControl('');
    const component = new InputDialogComponent(
      {} as any,
      {
        title: 'Search',
        control,
        type: FormTypes.TEXT,
        label: 'Query',
        ergonomics: {
          inputmode: 'search',
          enterkeyhint: 'search'
        }
      } as any,
      {} as any
    );

    expect(component.fieldConfig.ergonomics).toEqual({
      autofocus: true,
      enterkeyhint: 'search',
      inputmode: 'search'
    });
  });
});
