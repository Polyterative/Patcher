import { ReadOnlyDialogComponent } from './read-only-dialog.component';

describe('ReadOnlyDialogComponent', () => {
  let comp: ReadOnlyDialogComponent;
  let mockDialogRef: any;
  let mockData: any;

  beforeEach(() => {
    mockDialogRef = { close: jasmine.createSpy('close') };
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
