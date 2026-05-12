import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { PatchMinimalComponent } from './patch-minimal.component';
import { PatchDetailDataService, LinkedRackUiState } from '../patch-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import {
  BrandPrimaryButtonModule
} from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';


describe('PatchMinimalComponent - linked rack UI', () => {
  let fixture: ComponentFixture<PatchMinimalComponent>;
  let component: PatchMinimalComponent;
  let dataService: any;

  const linkedState = (partial: Partial<LinkedRackUiState>): LinkedRackUiState => ({
    kind: 'unlinked',
    statusTone: 'neutral',
    statusLabel: 'Collection-first',
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
        statusTone: 'positive',
        statusLabel: 'Linked rack active',
        description: 'This rack is optional context only.',
        rackName: 'Studio Rack',
        rackId: 7,
        rackImage: 'studio-rack.jpeg'
      })),
      linkedRackSelectionBlocked$: new BehaviorSubject<boolean>(false),
      linkedRackSelectionHint$: new BehaviorSubject<string | null>(null),
      linkedRackPersistenceBlocked$: new BehaviorSubject<boolean>(false),
      linkedRackPersistenceHint$: new BehaviorSubject<string | null>(null),
      linkedRackOptions$: new BehaviorSubject<any[]>([
        {id: '7', name: 'Studio Rack'}
      ]),
      patchConnections$: new BehaviorSubject<any[]>([]),
      patchModuleInstances$: new BehaviorSubject<any[]>([]),
      instanceLabelMap$: new BehaviorSubject<Map<number, string>>(new Map()),
      patchTags$: new BehaviorSubject<string[]>([]),
      isCurrentPatchPrivate$: new BehaviorSubject<boolean>(false),
      formData: {
        name: {control: new UntypedFormControl('Patch A')},
        description: {control: new UntypedFormControl('')},
        linkedRack: {control: new UntypedFormControl('')}
      },
      removePatchTag: jasmine.createSpy('removePatchTag'),
      addPatchTag: jasmine.createSpy('addPatchTag'),
      requestPatchPrivacyStatusChange$: {next: jasmine.createSpy('requestPatchPrivacyStatusChange$.next')},
      deletePatch$: {next: jasmine.createSpy('deletePatch$.next')},
      requestPatchEditingToggle$: {next: jasmine.createSpy('requestPatchEditingToggle$.next')}
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, RouterTestingModule, BrandPrimaryButtonModule],
      declarations: [PatchMinimalComponent],
      providers: [
        {provide: PatchDetailDataService, useValue: dataService},
        {provide: UserManagementService, useValue: {loggedUser$: of({id: 'user-1', username: 'owner'})}},
        {provide: UrlCreatorService, useValue: {
          copyLinkToClipboard: jasmine.createSpy('copyLinkToClipboard'),
          copyTextToClipboard: jasmine.createSpy('copyTextToClipboard')
        }}
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
    expect(host.textContent).toContain('Studio Rack');
    expect(host.textContent).not.toContain('This rack is optional context only.');
    expect(host.querySelector('.patch-linked-rack__info')).not.toBeNull();
  });

  it('renders a small linked rack preview when an image is available', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const preview = host.querySelector('.patch-linked-rack__preview') as HTMLImageElement | null;
    const previewLink = host.querySelector('.patch-linked-rack__preview-link') as HTMLAnchorElement | null;

    expect(preview).not.toBeNull();
    expect(previewLink).not.toBeNull();
    expect(previewLink?.getAttribute('aria-label')).toBe('Open linked rack');
    expect(preview?.src).toContain('/storage/v1/object/public/racks/studio-rack.jpeg');
  });

  it('renders the linked rack summary for non-owners in read-only mode', () => {
    dataService.singlePatchData$.next({
      id: 10,
      name: 'Patch A',
      author: {id: 'user-2', username: 'other-user'}
    });
    component.data = {
      id: 10,
      name: 'Patch A',
      author: {id: 'user-2', username: 'other-user'}
    } as any;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Linked rack');
    expect(host.textContent).toContain('Studio Rack');
  });

  it('keeps unavailable linked-rack state privacy-safe for non-owners', () => {
    dataService.singlePatchData$.next({
      id: 10,
      name: 'Patch A',
      author: {id: 'user-2', username: 'other-user'}
    });
    component.data = {
      id: 10,
      name: 'Patch A',
      author: {id: 'user-2', username: 'other-user'}
    } as any;
    dataService.linkedRackState$.next(linkedState({
      kind: 'unavailable',
      statusTone: 'warning',
      statusLabel: 'Rack unavailable',
      description: 'This patch references a linked rack, but that rack is not publicly available right now.',
      rackName: undefined,
      rackId: 42
    }));
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Linked rack');
    expect(host.textContent).toContain('This patch references a linked rack, but that rack is not publicly available right now.');
    expect(host.textContent).not.toContain('Studio Rack');
    expect(host.querySelector('.patch-linked-rack__name')).toBeNull();
    expect(host.querySelector('.patch-linked-rack__info')).toBeNull();
  });

  it('hides the separate clear action in edit mode', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('Clear linked rack');
  });

  it('builds descriptive patch text for clipboard export', () => {
    dataService.singlePatchData$.next({
      id: 10,
      name: 'Patch A',
      description: 'Warm evolving texture',
      public: true,
      author: {id: 'user-1', username: 'owner'}
    });
    dataService.patchTags$.next(['ambient', 'stereo']);
    dataService.instanceLabelMap$.next(new Map([[101, '(1)']]));
    dataService.patchModuleInstances$.next([
      {
        id: 101,
        module_id: 1,
        instance_label: '(1)',
        module: {name: 'Maths', manufacturer: {name: 'Make Noise'}}
      }
    ]);
    dataService.patchConnections$.next([
      {
        a: {name: 'Ch. 1 Out', module: {name: 'Maths', manufacturer: {name: 'Make Noise'}}},
        b: {name: 'Left In', module: {name: 'Mimeophon', manufacturer: {name: 'Make Noise'}}},
        instance_id_a: 101,
        notes: 'Slow modulation'
      }
    ]);

    const text = component.buildPatchText();

    expect(text).toContain('Patch: Patch A');
    expect(text).toContain('Description: Warm evolving texture');
    expect(text).toContain('Tags: ambient, stereo');
    expect(text).toContain('Linked rack: Studio Rack');
    expect(text).toContain('- Maths (1) by Make Noise');
    expect(text).toContain('1. Maths (1) · Ch. 1 Out -> Mimeophon · Left In — Note: Slow modulation');
    expect(text).toContain('/patches/details/10');
  });

  it('copies the generated patch text through UrlCreatorService', () => {
    const urlCreatorService = TestBed.inject(UrlCreatorService) as jasmine.SpyObj<UrlCreatorService>;

    component.copyPatchText();

    expect(urlCreatorService.copyTextToClipboard).toHaveBeenCalled();
    expect(urlCreatorService.copyTextToClipboard).toHaveBeenCalledWith(
      jasmine.stringContaining('Patch: Patch A'),
      'Patch text copied to clipboard.',
      'Clipboard write failed — copy the patch text manually.'
    );
  });

  it('shows the linked-rack help icon in edit mode', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const helpButton = host.querySelector('[aria-label="About linked rack"]');
    expect(helpButton).not.toBeNull();
  });

  it('shows a rich linked-rack help popover in edit mode', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    fixture.detectChanges();

    component.openLinkedRackHelp();

    expect(component.linkedRackHelpOpen).toBeTrue();
    expect(component.linkedRackHelpSections.map(section => section.title)).toEqual([
      'Why it helps',
      'Best moment to use it',
      'How it behaves'
    ]);
  });

  it('renders the no-racks hint when editing with no owned racks', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    dataService.linkedRackState$.next(linkedState({
      kind: 'unlinked',
      statusTone: 'neutral',
      statusLabel: 'Collection-first',
      description: 'No rack is linked yet.',
      rackId: null
    }));
    dataService.linkedRackOptions$.next([]);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('You do not have any racks yet.');
  });

  it('renders the rollout hint without a separate clear action when linked-rack persistence is blocked', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    dataService.linkedRackPersistenceBlocked$.next(true);
    dataService.linkedRackPersistenceHint$.next('Linked rack saving is not available yet in this environment.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Linked rack saving is not available yet in this environment.');
    expect(host.textContent).not.toContain('Clear linked rack');
  });

  it('renders the pending-connection hint when linked-rack switching is temporarily blocked', () => {
    dataService.patchEditingPanelOpenState$.next(true);
    dataService.linkedRackSelectionBlocked$.next(true);
    dataService.linkedRackSelectionHint$.next('Finish or cancel the pending connection before switching the linked rack.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Finish or cancel the pending connection before switching the linked rack.');
  });
});
