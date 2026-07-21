import {
  BreakpointObserver,
  BreakpointState
} from '@angular/cdk/layout';
import { MatDialogRef } from '@angular/material/dialog';
import {
  FormControl,
  Validators
} from '@angular/forms';
import { of } from 'rxjs';
import { AppStateService } from '../../app-state.service';
import { FormTypes } from '../../components/@smart/mat-form-entity/form-element-models';
import { ReadOnlyDialogComponent } from '../read-only-dialog/read-only-dialog.component';
import { InputDialogComponent } from './input-dialog.component';
import {
  InputDialogDataInModel,
  InputDialogDataOutModel
} from './input-dialog.types';


describe('InputDialogComponent', () => {
  const breakpointState: BreakpointState = {
    matches: false,
    breakpoints: {}
  };

  const createAppState = (): AppStateService => {
    const breakpointObserver = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);
    breakpointObserver.observe.and.returnValue(of(breakpointState));

    return new AppStateService(breakpointObserver);
  };

  const createDialogRef = (): jasmine.SpyObj<MatDialogRef<ReadOnlyDialogComponent, InputDialogDataOutModel>> =>
    jasmine.createSpyObj<MatDialogRef<ReadOnlyDialogComponent, InputDialogDataOutModel>>('MatDialogRef', ['close']);

  const createComponent = (
    data: InputDialogDataInModel,
    dialogRef = createDialogRef()
  ): InputDialogComponent => new InputDialogComponent(dialogRef, data, createAppState());

  it('updates validity stream when form control value changes', () => {
    const control = new FormControl('', [Validators.required]);
    const component = createComponent({
      title: 'Rename',
      control,
      type: FormTypes.TEXT,
      label: 'Name'
    });
    
    expect(component.isValid$.value).toBeFalse();
    
    control.setValue('valid');
    expect(component.isValid$.value).toBeTrue();
    
    control.setValue('');
    expect(component.isValid$.value).toBeFalse();
  });
  
  it('stops reacting to changes after destroy', () => {
    const control = new FormControl('', [Validators.required]);
    const component = createComponent({
      title: 'Rename',
      control,
      type: FormTypes.TEXT,
      label: 'Name'
    });
    
    control.setValue('valid');
    expect(component.isValid$.value).toBeTrue();
    
    component.ngOnDestroy();
    control.setValue('');
    
    expect(component.isValid$.value).toBeTrue();
  });

  it('confirms only when the control is valid', () => {
    const control = new FormControl('', [Validators.required]);
    const dialogRef = createDialogRef();
    const component = createComponent({
      title: 'Rename',
      control,
      type: FormTypes.TEXT,
      label: 'Name'
    }, dialogRef);

    component.confirm();
    expect(dialogRef.close).not.toHaveBeenCalled();

    control.setValue('valid');
    component.confirm();
    expect(dialogRef.close).toHaveBeenCalledWith({result: 'valid'});
  });

  it('builds a shared field config with default done ergonomics', () => {
    const control = new FormControl('');
    const component = createComponent({
      title: 'Rename',
      control,
      type: FormTypes.TEXT,
      label: 'Name'
    });

    expect(component.fieldConfig.control).toBe(control);
    expect(component.fieldConfig.ergonomics).toEqual({
      autofocus: true,
      enterkeyhint: 'done'
    });
  });

  it('lets callers override shared dialog ergonomics', () => {
    const control = new FormControl('');
    const component = createComponent({
      title: 'Search',
      control,
      type: FormTypes.TEXT,
      label: 'Query',
      ergonomics: {
        inputmode: 'search',
        enterkeyhint: 'search'
      }
    });

    expect(component.fieldConfig.ergonomics).toEqual({
      autofocus: true,
      enterkeyhint: 'search',
      inputmode: 'search'
    });
  });
});
