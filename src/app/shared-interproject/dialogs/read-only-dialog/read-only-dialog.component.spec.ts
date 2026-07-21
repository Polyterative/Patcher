import { MatDialogRef } from '@angular/material/dialog';
import { ReadOnlyDialogComponent } from './read-only-dialog.component';
import {
  ReadOnlyDialogDataInModel,
  ReadOnlyDialogDataOutModel
} from './read-only-dialog.types';

describe('ReadOnlyDialogComponent', () => {
  let comp: ReadOnlyDialogComponent;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ReadOnlyDialogComponent, ReadOnlyDialogDataOutModel>>;
  let mockData: ReadOnlyDialogDataInModel;

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj<MatDialogRef<ReadOnlyDialogComponent, ReadOnlyDialogDataOutModel>>(
      'MatDialogRef',
      ['close']
    );
    mockData = { title: 'Test Title', description: 'Test Description' };
    comp = new ReadOnlyDialogComponent(mockDialogRef, mockData);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes data from MAT_DIALOG_DATA', () => {
    expect(comp.data).toBe(mockData);
  });

  it('title is set from data', () => {
    expect(comp.title).toBe('Test Title');
  });

  it('description is set from data', () => {
    expect(comp.description).toBe('Test Description');
  });
});
