import { AdminFlagsComponent } from './admin-flags.component';
import { Subject } from 'rxjs';

describe('AdminFlagsComponent', () => {
  let comp: AdminFlagsComponent;
  let mockDataService: any;
  let mockBackend: any;
  let mockSnackBar: any;

  beforeEach(() => {
    mockDataService = { deleteFlag$: new Subject<number>() };
    spyOn(mockDataService.deleteFlag$, 'next').and.callThrough();
    mockBackend = {};
    mockSnackBar = {};
    comp = new AdminFlagsComponent(mockDataService, mockBackend, mockSnackBar);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('confirmDelete emits deleteFlag$ when user confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    comp.confirmDelete(42);
    expect(mockDataService.deleteFlag$.next).toHaveBeenCalledWith(42);
  });

  it('confirmDelete does not emit when user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    comp.confirmDelete(42);
    expect(mockDataService.deleteFlag$.next).not.toHaveBeenCalled();
  });
});
