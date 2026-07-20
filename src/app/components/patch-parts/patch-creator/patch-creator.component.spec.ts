import { of, throwError } from 'rxjs';
import { PatchCreatorComponent } from './patch-creator.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { PatchCreatorDataService } from './patch-creator-data.service';
import {
  PatchCreatorInModel,
  PatchCreatorOutModel
} from './patch-creator.types';
import { Rack } from 'src/app/models/rack';

type CreatePatchResponse = ReturnType<PatchCreatorDataService['createPatch$']>;
type CurrentUserRacksResponse = ReturnType<PatchCreatorDataService['currentUserRacks$']>;

function createPatchResponse(value: unknown): CreatePatchResponse {
  return of(value) as CreatePatchResponse;
}

function currentUserRacksResponse(racks: Rack[]): CurrentUserRacksResponse {
  return of(racks) as CurrentUserRacksResponse;
}

function rackFixture(id: number, name: string): Rack {
  return {
    id,
    name,
    description: '',
    hp: 84,
    rows: 2,
    author: {id: 'user-1', username: 'owner'},
    locked: false,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z'
  };
}


describe('PatchCreatorComponent', () => {
  function build(data: PatchCreatorInModel = {}) {
    const dataService = jasmine.createSpyObj<PatchCreatorDataService>('PatchCreatorDataService', ['currentUserRacks$', 'createPatch$']);
    dataService.currentUserRacks$.and.returnValue(currentUserRacksResponse([]));
    dataService.createPatch$.and.returnValue(createPatchResponse({id: 1}));

    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue({
      onAction: () => of(undefined)
    } as MatSnackBarRef<TextOnlySnackBar>);
    const dialogRef = jasmine.createSpyObj<MatDialogRef<PatchCreatorComponent, PatchCreatorOutModel>>('MatDialogRef', ['close']);
    const component = new PatchCreatorComponent(
      snackBar,
      dialogRef,
      data,
      analytics,
      dataService
    );
    return {component, dataService, analytics, snackBar, dialogRef};
  }
  
  it('creates a patch and closes the dialog on save', () => {
    const {component, dataService, snackBar, dialogRef} = build();
    component.fields.name.control.setValue('My Patch');
    
    component.save$.next();
    
    expect(dataService.createPatch$).toHaveBeenCalledWith({name: 'My Patch', public: true});
    expect(snackBar.open).toHaveBeenCalledWith(
      '"My Patch" created and saved to your library.',
      undefined,
      {duration: 3000, panelClass: 'snack-success'}
    );
    expect(dialogRef.close).toHaveBeenCalled();
  });
  
  it('passes the selected privacy value when saving', () => {
    const {component, dataService} = build();
    component.fields.name.control.setValue('Private Patch');
    component.fields.public.control.setValue(false);
    
    component.save$.next();
    
    expect(dataService.createPatch$).toHaveBeenCalledWith({name: 'Private Patch', public: false});
  });

  it('includes linked_rack_id when a linked rack is selected', () => {
    const {component, dataService} = build();
    component.fields.name.control.setValue('Linked Patch');
    component.fields.linkedRack.control.setValue({id: '42', name: 'Studio Rack'});

    component.save$.next();

    expect(dataService.createPatch$).toHaveBeenCalledWith({
      name: 'Linked Patch',
      public: true,
      linked_rack_id: 42
    });
  });

  it('defaults new patches to public visibility', () => {
    const {component} = build();

    expect(component.fields.public.control.value).toBeTrue();
  });

  it('captures the created patch id from the data service response', () => {
    const {component, dataService, analytics} = build();
    dataService.createPatch$.and.returnValue(createPatchResponse({data: [{id: 73}]}));
    component.fields.name.control.setValue('Tracked Patch');

    component.save$.next();

    expect(analytics.capture).toHaveBeenCalledWith('patch.created', {patch_id: 73});
  });

  it('loads the current user racks into linked rack options on init', () => {
    const {component, dataService} = build();
    dataService.currentUserRacks$.and.returnValue(currentUserRacksResponse([
      rackFixture(7, 'Studio Rack'),
      rackFixture(11, 'Travel Case')
    ]));

    component.ngOnInit();

    expect(dataService.currentUserRacks$).toHaveBeenCalled();
    let options: { id: string; name: string }[] | undefined;
    component.linkedRackOptions$.subscribe(v => options = v).unsubscribe();
    expect(options).toEqual([
      {id: '7', name: 'Studio Rack'},
      {id: '11', name: 'Travel Case'}
    ]);
  });

  it('preselects the linked rack from dialog data when provided', () => {
    const {component, dataService} = build({linkedRackId: 11});
    dataService.currentUserRacks$.and.returnValue(currentUserRacksResponse([
      rackFixture(7, 'Studio Rack'),
      rackFixture(11, 'Travel Case')
    ]));

    component.ngOnInit();

    expect(component.fields.linkedRack.control.value).toEqual({
      id: '11',
      name: 'Travel Case'
    });
  });
  
  it('stops reacting to save after destroy', () => {
    const {component, dataService} = build();
    
    component.ngOnDestroy();
    component.save$.next();
    
    expect(dataService.createPatch$).not.toHaveBeenCalled();
  });
  
  it('initializes with a generated non-empty patch name', () => {
    const {component} = build();
    const patchName = component.fields.name.control.value;
    expect(typeof patchName).toBe('string');
    expect(patchName.length).toBeGreaterThan(0);
  });

  it('blocks linked-rack selection when the environment cannot save linked racks yet', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {component, dataService, dialogRef} = build();
    component.fields.name.control.setValue('Linked Patch');
    component.fields.linkedRack.control.setValue({id: '42', name: 'Studio Rack'});
    dataService.createPatch$.and.returnValue(throwError(() => ({
      code: 'PGRST204',
      message: "Column 'linked_rack_id' of relation 'patches' does not exist"
    })) as CreatePatchResponse);

    component.save$.next();

    let blocked = false;
    component.linkedRackPersistenceBlocked$.subscribe(v => blocked = v).unsubscribe();
    expect(blocked).toBeTrue();
    expect(component.fields.linkedRack.control.disabled).toBeTrue();
    expect(component.fields.linkedRack.control.value).toBe('');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
});
