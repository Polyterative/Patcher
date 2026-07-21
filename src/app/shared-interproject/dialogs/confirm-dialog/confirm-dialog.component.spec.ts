import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import {
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from './confirm-dialog.types';


describe('ConfirmDialogComponent', () => {
  const createDialogRef = (): jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent, ConfirmDialogDataOutModel>> =>
    jasmine.createSpyObj<MatDialogRef<ConfirmDialogComponent, ConfirmDialogDataOutModel>>('MatDialogRef', ['close']);

  const createComponent = (
    data: ConfirmDialogDataInModel
  ): ConfirmDialogComponent => new ConfirmDialogComponent(createDialogRef(), data);

  it('copies positive and negative labels from dialog data', () => {
    const data: ConfirmDialogDataInModel = {
      title: 'Delete',
      description: 'Are you sure?',
      positive: {label: 'yes'},
      negative: {label: 'no'}
    };
    
    const component = createComponent(data);
    
    expect(component.title).toBe('Delete');
    expect(component.description).toBe('Are you sure?');
    expect(component.positive).toEqual({label: 'yes'});
    expect(component.negative).toEqual({label: 'no'});
  });

  it('leaves positive and negative undefined when not provided in dialog data', () => {
    const data: ConfirmDialogDataInModel = {title: 'Warning', description: 'Something happened'};
    const component = createComponent(data);
    expect(component.positive).toBeUndefined();
    expect(component.negative).toBeUndefined();
  });

  it('still sets title and description when positive/negative are omitted', () => {
    const data: ConfirmDialogDataInModel = {title: 'Confirm', description: 'Proceed?'};
    const component = createComponent(data);
    expect(component.title).toBe('Confirm');
    expect(component.description).toBe('Proceed?');
  });

  it('data property references the original dialog data', () => {
    const data: ConfirmDialogDataInModel = {title: 'Check', description: 'desc'};
    const component = createComponent(data);
    expect(component.data).toBe(data);
  });
});