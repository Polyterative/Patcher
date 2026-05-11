import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  of,
  Subject
} from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SelectionPanelBridgeService } from 'src/app/components/patch-parts/selection-panel-bridge.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';


/**
 * Unit Tests - Patch Detail Data Service Privacy Management
 *
 * Basic API surface tests for privacy state management implemented 2026-02-18
 *
 * Note: Full integration tests exist in integration-user-patches.spec.ts
 * These tests verify the service has the correct public API for privacy
 */
describe('PatchDetailDataService - Privacy API Surface', () => {
  let service: PatchDetailDataService;
  let mockSupabaseService: any;
  let mockUserService: any;
  let mockRouter: any;
  
  beforeEach(() => {
    // Create minimal mocks to allow service initialization
    mockSupabaseService = {
      cacheResetter$: new Subject<string[]>(),
      get: {
        patchWithId: jasmine.createSpy('patchWithId').and.returnValue(of({data: null, error: null})),
        currentUserPatches: jasmine.createSpy('currentUserPatches').and.returnValue(of([]))
      },
      GET: {
        patchConnections: jasmine.createSpy('patchConnections').and.returnValue(of([])),
        publicPatchWithId: jasmine.createSpy('publicPatchWithId').and.returnValue(of({data: null, error: null}))
      },
      update: {
        patch: jasmine.createSpy('patch').and.returnValue(of({data: null, error: null})),
        patchSilent: jasmine.createSpy('patchSilent').and.returnValue(of({data: null, error: null})),
        patchConnectionsSilent: jasmine.createSpy('patchConnectionsSilent').and.returnValue(of({data: null, error: null}))
      },
      delete: {
        userPatch: jasmine.createSpy('userPatch').and.returnValue(of({data: null, error: null})),
        patchConnectionsForPatch: jasmine.createSpy('patchConnectionsForPatch').and.returnValue(of({data: null, error: null}))
      },
      add: {
        patchConnection: jasmine.createSpy('patchConnection').and.returnValue(of({data: null, error: null}))
      },
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(
          of({id: 'test-user', email: 'test@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString()})
        )
      }
    };
    
    mockUserService = {
      loggedUser$: of({id: 'test-user', username: 'testuser', email: 'test@example.com'})
    };
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule, MatDialogModule],
      providers: [
        PatchDetailDataService,
        SelectionPanelBridgeService,
        {provide: SupabaseService, useValue: mockSupabaseService},
        {provide: UserManagementService, useValue: mockUserService},
        {provide: Router, useValue: mockRouter}
      ]
    });
    
    service = TestBed.inject(PatchDetailDataService);
  });
  
  afterEach(() => {
    service.ngOnDestroy();
  });
  
  it('should create service', () => {
    expect(service).toBeDefined();
  });
  
  it('should have isCurrentPatchPrivate$ BehaviorSubject', () => {
    expect(service.isCurrentPatchPrivate$).toBeDefined();
    expect(service.isCurrentPatchPrivate$.value).toBeDefined();
    expect(typeof service.isCurrentPatchPrivate$.value).toBe('boolean');
  });
  
  it('should have requestPatchPrivacyStatusChange$ Subject', () => {
    expect(service.requestPatchPrivacyStatusChange$).toBeDefined();
    expect(service.requestPatchPrivacyStatusChange$).toBeInstanceOf(Subject);
  });
  
  it('should initialize isCurrentPatchPrivate$ as false', () => {
    expect(service.isCurrentPatchPrivate$.value).toBe(false);
  });

  it('should initialize patchDetailUnavailableMessage$ as null', () => {
    expect(service.patchDetailUnavailableMessage$.value).toBeNull();
  });

  it('uses public patch reads when public detail mode is enabled', () => {
    service.setPublicDetailMode(true);

    service.updateSinglePatchData$.next(42);

    expect(mockSupabaseService.GET.publicPatchWithId).toHaveBeenCalledWith(42);
    expect(mockSupabaseService.get.patchWithId).not.toHaveBeenCalledWith(42);
  });

  it('marks public detail as unavailable when the public patch read returns no data', () => {
    mockSupabaseService.GET.publicPatchWithId.and.returnValue(of({data: null, error: null}));
    service.setPublicDetailMode(true);

    service.updateSinglePatchData$.next(42);

    expect(service.singlePatchData$.value).toBeUndefined();
    expect(service.patchDetailUnavailableMessage$.value).toContain(`isn't publicly available`);
  });
});
