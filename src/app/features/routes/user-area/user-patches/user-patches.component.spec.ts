import { MatSnackBar } from '@angular/material/snack-bar';
import { UserPatchesComponent } from './user-patches.component';
import { Subject } from 'rxjs';
import { PatchMinimal } from 'src/app/models/patch';
import { RoutingService } from 'src/app/services/routing.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';

describe('UserPatchesComponent', () => {
  let comp: UserPatchesComponent;
  let mockDialog: any;
  let mockBackend: any;
  let mockDataService: any;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let writeTextSpy: jasmine.Spy;

  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText: jasmine.createSpy('writeText')},
      configurable: true
    });
  });

  beforeEach(() => {
    mockDialog = {};
    mockBackend = {};
    mockDataService = { updatePatchesData$: new Subject<void>() };
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    writeTextSpy = navigator.clipboard.writeText as jasmine.Spy;
    writeTextSpy.calls.reset();
    writeTextSpy.and.returnValue(Promise.resolve());
    spyOn(mockDataService.updatePatchesData$, 'next').and.callThrough();
    comp = new UserPatchesComponent(
      mockDialog,
      mockBackend,
      mockDataService,
      new RoutingService({} as never),
      new UrlCreatorService({} as never, snackBar, {} as never)
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

  it('copies an absolute public_id patch share link and shows confirmation', async () => {
    comp.copyPatchShareLink(patch({public_id: 'patch-token'}));

    expect(writeTextSpy).toHaveBeenCalledOnceWith(`${ window.location.origin }/patches/patch-token`);
    await Promise.resolve();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Share link copied.',
      undefined,
      {duration: 2000, panelClass: 'snack-success'}
    );
  });

  it('copies an absolute legacy patch share link when public_id is missing', () => {
    comp.copyPatchShareLink(patch({id: 77, public_id: undefined}));

    expect(writeTextSpy).toHaveBeenCalledOnceWith(`${ window.location.origin }/patches/details/77`);
  });
});

function patch(overrides: Partial<PatchMinimal>): PatchMinimal {
  return {
    id: 24,
    name: 'Test patch',
    public: false,
    author: {} as PatchMinimal['author'],
    ...overrides
  } as PatchMinimal;
}
