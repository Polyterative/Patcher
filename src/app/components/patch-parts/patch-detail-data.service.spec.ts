import { PatchDetailDataService } from './patch-detail-data.service';
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import {
  Observable,
  of
} from 'rxjs';
import { CVConnectionEntity } from '../../models/cv';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SupabaseService } from '../../features/backend/supabase.service';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import {
  PatchConnection,
  PatchModuleInstance
} from '../../models/connection';
import { CVConnectionState } from './patch-detail-data.models';
import { cvWithModuleFixture } from './patch-graph/patch-graph-test-fixtures';


type UserSession = { id: string } | null;
type MutationResponse = Record<string, never>;
type DialogAnswer = { answer: boolean };

interface PatchDetailBackendDouble {
  auth: {
    getUserSession$: jasmine.Spy<() => Observable<UserSession>>;
  };
  GET: {
    patchConnections: jasmine.Spy<(patchId: number) => Observable<PatchConnection[]>>;
  };
  delete: {
    patchModuleInstance: jasmine.Spy<(instanceId: number) => Observable<MutationResponse>>;
  };
  storage: {
    publicUrlBases: {
      racks: string;
    };
  };
}

interface BuildFixture {
  service: PatchDetailDataService;
  bridge: SelectionPanelBridgeService;
}

function mutationResponse(): MutationResponse {
  return {};
}

function supabaseServiceDouble(backend: PatchDetailBackendDouble): SupabaseService {
  const serviceDouble: SupabaseService = Object.create(SupabaseService.prototype);
  return Object.assign(serviceDouble, backend);
}

function selectedEntity(
  id: number,
  moduleId: number,
  name: string,
  moduleName: string,
  instanceId: number,
  kind: CVConnectionEntity['kind']
): CVConnectionEntity {
  return {
    cv: {
      ...cvWithModuleFixture(id, moduleId, moduleName, name),
      instance_id: instanceId
    },
    kind
  };
}

function patchModuleInstance(id: number, moduleId: number): PatchModuleInstance {
  return {
    id,
    patch_id: 1,
    module_id: moduleId,
    instance_label: null
  };
}

function build(): BuildFixture {
  const bridge = new SelectionPanelBridgeService();
  const backend: PatchDetailBackendDouble = {
    auth: {
      getUserSession$: jasmine.createSpy<() => Observable<UserSession>>('getUserSession$').and.returnValue(of(null))
    },
    GET: {
      patchConnections: jasmine.createSpy<(patchId: number) => Observable<PatchConnection[]>>('patchConnections')
        .and.returnValue(of([]))
    },
    delete: {
      patchModuleInstance: jasmine.createSpy<(instanceId: number) => Observable<MutationResponse>>('patchModuleInstance')
        .and.returnValue(of(mutationResponse()))
    },
    storage: {publicUrlBases: {racks: 'https://images.patcher.xyz/racks/'}}
  };
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
  const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
  dialog.open.and.returnValue({
    afterClosed: () => of({answer: true})
  } as MatDialogRef<unknown, DialogAnswer>);
  const userService = jasmine.createSpyObj<UserManagementService>('UserManagementService', ['ngOnDestroy']);
  const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
  const service = new PatchDetailDataService(
    router, snackBar, dialog, userService, supabaseServiceDouble(backend), bridge, analytics
  );

  return {service, bridge};
}

describe('PatchDetailDataService selection behavior', () => {
  let service: PatchDetailDataService;
  let bridge: SelectionPanelBridgeService;
  
  beforeEach(() => {
    ({service, bridge} = build());
  });

  afterEach(() => {
    service.ngOnDestroy();
    bridge.ngOnDestroy();
  });
  
  it('should not resurrect a cleared output when selecting an input after cancel', (done) => {
    const out = selectedEntity(1, 11, 'Out', 'M', 100, 'out');
    const inp = selectedEntity(2, 12, 'In', 'N', 200, 'in');
    
    // Subscribe to selection changes
    const states: CVConnectionState[] = [];
    const sub = service.selectedForConnection$.subscribe(s => states.push(s));
    
    // Click output
    service.clickOnModuleCV$.next(out);
    // Cancel selection (global)
    bridge.reset$.next();
    // Click input
    service.clickOnModuleCV$.next(inp);
    
    // Give microtask time, then assert
    setTimeout(() => {
      // Last state should have only b set (input), a should be null
      const last = states[states.length - 1];
      expect(last.a).toBeNull();
      expect(last.b).toBeTruthy();
      sub.unsubscribe();
      done();
    }, 10);
  });
  
  it('when both sides selected, per-side deselect clears only that side', (done) => {
    const out = selectedEntity(1, 11, 'Out', 'M', 100, 'out');
    const inp = selectedEntity(2, 12, 'In', 'N', 200, 'in');
    
    const states: CVConnectionState[] = [];
    const sub = service.selectedForConnection$.subscribe(s => states.push(s));
    
    service.clickOnModuleCV$.next(out);
    service.clickOnModuleCV$.next(inp);
    
    // Deselect only A
    bridge.resetA$.next();
    
    setTimeout(() => {
      const last = states[states.length - 1];
      expect(last.a).toBeNull();
      expect(last.b).toBeTruthy();
      
      // Now select A again and then deselect B
      service.clickOnModuleCV$.next(out);
      bridge.resetB$.next();
      
      setTimeout(() => {
        const last2 = states[states.length - 1];
        expect(last2.a).toBeTruthy();
        expect(last2.b).toBeNull();
        sub.unsubscribe();
        done();
      }, 10);
    }, 10);
  });
  
  it('when the instance on side A is deleted, only side A is cleared', (done) => {
    const instanceA = patchModuleInstance(101, 11);
    const instanceB = patchModuleInstance(201, 12);
    const out = selectedEntity(1, 11, 'Out', 'M', 101, 'out');
    const inp = selectedEntity(2, 12, 'In', 'N', 201, 'in');

    service.patchModuleInstances$.next([instanceA, instanceB]);
    service.clickOnModuleCV$.next(out);
    service.clickOnModuleCV$.next(inp);

    const states: CVConnectionState[] = [];
    const sub = service.selectedForConnection$.subscribe(s => states.push(s));

    service.removeModuleInstance$.next(instanceA);

    setTimeout(() => {
      const last = states[states.length - 1];
      expect(last.a).toBeNull();
      expect(last.b).toBeTruthy();
      sub.unsubscribe();
      done();
    }, 10);
  });

  it('when the instance on side B is deleted, only side B is cleared', (done) => {
    const instanceA = patchModuleInstance(101, 11);
    const instanceB = patchModuleInstance(201, 12);
    const out = selectedEntity(1, 11, 'Out', 'M', 101, 'out');
    const inp = selectedEntity(2, 12, 'In', 'N', 201, 'in');

    service.patchModuleInstances$.next([instanceA, instanceB]);
    service.clickOnModuleCV$.next(out);
    service.clickOnModuleCV$.next(inp);

    const states: CVConnectionState[] = [];
    const sub = service.selectedForConnection$.subscribe(s => states.push(s));

    service.removeModuleInstance$.next(instanceB);

    setTimeout(() => {
      const last = states[states.length - 1];
      expect(last.a).toBeTruthy();
      expect(last.b).toBeNull();
      sub.unsubscribe();
      done();
    }, 10);
  });

  it('clears confirmed flag when selection changes after confirm', (done) => {
    const out1 = selectedEntity(1, 11, 'Out1', 'M', 100, 'out');
    const inp1 = selectedEntity(2, 12, 'In1', 'N', 200, 'in');
    const out2 = selectedEntity(3, 13, 'Out2', 'O', 300, 'out');
    
    // simulate selecting both and confirming
    service.clickOnModuleCV$.next(out1);
    service.clickOnModuleCV$.next(inp1);
    // mark confirmed
    bridge.record$.next();
    
    // observe confirmed$ (derived observable) and capture its last value
    let lastConfirmed: boolean | undefined = undefined;
    const sub = bridge.confirmed$.subscribe(v => lastConfirmed = v);
    
    // change output to out2
    service.clickOnModuleCV$.next(out2);
    
    setTimeout(() => {
      expect(lastConfirmed).toBeFalse();
      sub.unsubscribe();
      done();
    }, 10);
  });

  it('selectedForConnection$ starts in empty state with no CV selected', () => {
    const initial = service.selectedForConnection$.value;
    expect(initial.a).toBeNull();
    expect(initial.b).toBeNull();
  });

  it('patchModuleInstances$ starts as an empty array', () => {
    expect(service.patchModuleInstances$.value).toEqual([]);
  });

  it('isCurrentPatchPrivate$ starts as false', () => {
    expect(service.isCurrentPatchPrivate$.value).toBeFalse();
  });

  it('patchEditingPanelOpenState$ starts as false', () => {
    expect(service.patchEditingPanelOpenState$.value).toBeFalse();
  });

  it('singlePatchData$ starts as undefined', () => {
    expect(service.singlePatchData$.value).toBeUndefined();
  });

  it('patchConnections$ starts as null', () => {
    expect(service.patchConnections$.value).toBeNull();
  });

  it('collectionModules$ starts as empty array', () => {
    expect(service.collectionModules$.value).toEqual([]);
  });

  it('multiInstanceSummary$ starts as empty array', () => {
    expect(service.multiInstanceSummary$.value).toEqual([]);
  });

  it('shouldShowPanelImages$ starts as true', () => {
    expect(service.shouldShowPanelImages$.value).toBeTrue();
  });

  it('builds rack preview URLs from the backend storage namespace', () => {
    expect(service.getRackPreviewUrl('studio-rack.jpeg')).toBe('https://images.patcher.xyz/racks/studio-rack.jpeg');
  });

  it('patchTags$ starts as empty array', () => {
    expect(service.patchTags$.value).toEqual([]);
  });

  it('instanceLabelMap$ starts as empty Map', () => {
    expect(service.instanceLabelMap$.value.size).toBe(0);
  });

});