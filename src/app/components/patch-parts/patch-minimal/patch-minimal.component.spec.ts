import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { PatchMinimalComponent } from './patch-minimal.component';
import { PatchDetailDataService, LinkedRackUiState } from '../patch-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';


describe('PatchMinimalComponent - linked rack UI', () => {
  let fixture: ComponentFixture<PatchMinimalComponent>;
  let component: PatchMinimalComponent;
  let dataService: any;

  const linkedState = (partial: Partial<LinkedRackUiState>): LinkedRackUiState => ({
    kind: 'unlinked',
    statusLabel: 'In collection only',
    description: 'No rack is linked yet.',
    rackId: null,
    ...partial
  });

  beforeEach(async () => {
    dataService = {
      patchEditingPanelOpenState$: new BehaviorSubject<boolean>(false),
      singlePatchData$: new BehaviorSubject<any>({
        id: 10,
        name: 'Patch A',
        author: {id: 'user-1', username: 'owner'}
      }),
      linkedRackState$: new BehaviorSubject<LinkedRackUiState>(linkedState({
        kind: 'linked',
        statusLabel: 'In linked rack',
        description: 'This rack is optional context only.',
        rackName: 'Studio Rack',
        rackId: 7
      })),
      linkedRackOptions$: new BehaviorSubject<any[]>([
        {id: '7', name: 'Studio Rack'}
      ]),
      patchTags$: new BehaviorSubject<string[]>([]),
      isCurrentPatchPrivate$: new BehaviorSubject<boolean>(false),
      formData: {
        name: {control: new UntypedFormControl('Patch A')},
        description: {control: new UntypedFormControl('')},
        linkedRack: {control: new UntypedFormControl('')}
      },
      removePatchTag: jasmine.createSpy('removePatchTag'),
      addPatchTag: jasmine.createSpy('addPatchTag'),
      clearLinkedRack: jasmine.createSpy('clearLinkedRack'),
      requestPatchPrivacyStatusChange$: {next: jasmine.createSpy('requestPatchPrivacyStatusChange$.next')},
      deletePatch$: {next: jasmine.createSpy('deletePatch$.next')},
      requestPatchEditingToggle$: {next: jasmine.createSpy('requestPatchEditingToggle$.next')}
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [PatchMinimalComponent],
      providers: [
        {provide: PatchDetailDataService, useValue: dataService},
        {provide: UserManagementService, useValue: {loggedUser$: of({id: 'user-1', username: 'owner'})}},
        {provide: UrlCreatorService, useValue: {copyLinkToClipboard: jasmine.createSpy('copyLinkToClipboard')}}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PatchMinimalComponent);
    component = fixture.componentInstance;
    component.data = {
      id: 10,
      name: 'Patch A',
      author: {id: 'user-1', username: 'owner'}
    } as any;
    component.viewConfig = {
      hideLabels: false,
      hideManufacturer: false,
      hideDescription: false,
      hideButtons: false,
      hideHP: false,
      hideDates: false
    };
  });

  it('renders linked rack summary text in read-only mode', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Linked rack');
    expect(host.textContent).toContain('In linked rack');
    expect(host.textContent).toContain('Studio Rack');
    expect(host.textContent).toContain('This rack is optional context only.');
  });

  it('shows clear action in edit mode and forwards the click', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const clearButton = host.querySelector('.patch-linked-rack__clear') as HTMLButtonElement | null;
    expect(clearButton).not.toBeNull();

    clearButton?.click();

    expect(dataService.clearLinkedRack).toHaveBeenCalled();
  });

  it('renders the no-racks hint when editing with no owned racks', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    dataService.linkedRackState$.next(linkedState({
      kind: 'unlinked',
      statusLabel: 'In collection only',
      description: 'No rack is linked yet.',
      rackId: null
    }));
    dataService.linkedRackOptions$.next([]);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('You do not have any racks yet.');
  });
});
