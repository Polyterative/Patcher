import { UserPatchesComponent } from './user-patches.component';
import { Subject } from 'rxjs';

describe('UserPatchesComponent', () => {
  let comp: UserPatchesComponent;
  let mockDialog: any;
  let mockBackend: any;
  let mockDataService: any;

  beforeEach(() => {
    mockDialog = {};
    mockBackend = {};
    mockDataService = { updatePatchesData$: new Subject<void>() };
    spyOn(mockDataService.updatePatchesData$, 'next').and.callThrough();
    comp = new UserPatchesComponent(
      mockDialog,
      mockBackend,
      mockDataService,
    );
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('calls updatePatchesData$.next() in constructor', () => {
    expect(mockDataService.updatePatchesData$.next).toHaveBeenCalledOnceWith();
  });

  it('globalSearchQuery defaults to empty string', () => {
    expect(comp.globalSearchQuery).toBe('');
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('globalSearchQuery input can be assigned', () => {
    comp.globalSearchQuery = 'bass';
    expect(comp.globalSearchQuery).toBe('bass');
  });
});
