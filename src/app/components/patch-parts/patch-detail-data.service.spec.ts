import { PatchDetailDataService } from './patch-detail-data.service';
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import { of } from 'rxjs';
import { CVConnectionEntity } from '../../models/cv';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';


class DummyBackend {}

class DummyUserService {}

const routerStub = {
  navigate: (_: any) => {
  }
};
const snackStub = {
  open: (_: any) => {
  },
} as unknown as MatSnackBar;
const dialogStub = {open: (_: any) => ({afterClosed: () => of({answer: true})})} as unknown as MatDialog;

describe('PatchDetailDataService selection behavior', () => {
  let service: PatchDetailDataService;
  let bridge: SelectionPanelBridgeService;
  
  beforeEach(() => {
    // Lightweight stubs for the constructor dependencies
    bridge = new SelectionPanelBridgeService();
    const backendStub: any = {
      auth: {getUserSession$: () => of(null)},
      GET: {patchConnections: (_: any) => of([])},
      delete: {patchModuleInstance: (_: any) => of({})}
    };
    const router = routerStub as any;
    const snack = snackStub as any;
    const dialog = dialogStub as any;
    const userService = new DummyUserService() as any;

    service = new PatchDetailDataService(router, snack, dialog, userService, backendStub, bridge);
  });

  afterEach(() => {
    service.ngOnDestroy();
    bridge.ngOnDestroy();
  });
  
  it('should not resurrect a cleared output when selecting an input after cancel', (done) => {
    // Simulate clicking an output
    const out: CVConnectionEntity = {cv: {id: 1, name: 'Out', module: {id: 11, name: 'M'}, instance_id: 100}, kind: 'out'} as any;
    const inp: CVConnectionEntity = {cv: {id: 2, name: 'In', module: {id: 12, name: 'N'}, instance_id: 200}, kind: 'in'} as any;
    
    // Subscribe to selection changes
    const states: any[] = [];
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
    const out: CVConnectionEntity = {cv: {id: 1, name: 'Out', module: {id: 11, name: 'M'}, instance_id: 100}, kind: 'out'} as any;
    const inp: CVConnectionEntity = {cv: {id: 2, name: 'In', module: {id: 12, name: 'N'}, instance_id: 200}, kind: 'in'} as any;
    
    const states: any[] = [];
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
    const instanceA: any = {id: 101, module_id: 11};
    const instanceB: any = {id: 201, module_id: 12};
    const out: CVConnectionEntity = {cv: {id: 1, name: 'Out', module: {id: 11, name: 'M'}, instance_id: 101}, kind: 'out'} as any;
    const inp: CVConnectionEntity = {cv: {id: 2, name: 'In', module: {id: 12, name: 'N'}, instance_id: 201}, kind: 'in'} as any;

    service.patchModuleInstances$.next([instanceA, instanceB]);
    service.clickOnModuleCV$.next(out);
    service.clickOnModuleCV$.next(inp);

    const states: any[] = [];
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
    const instanceA: any = {id: 101, module_id: 11};
    const instanceB: any = {id: 201, module_id: 12};
    const out: CVConnectionEntity = {cv: {id: 1, name: 'Out', module: {id: 11, name: 'M'}, instance_id: 101}, kind: 'out'} as any;
    const inp: CVConnectionEntity = {cv: {id: 2, name: 'In', module: {id: 12, name: 'N'}, instance_id: 201}, kind: 'in'} as any;

    service.patchModuleInstances$.next([instanceA, instanceB]);
    service.clickOnModuleCV$.next(out);
    service.clickOnModuleCV$.next(inp);

    const states: any[] = [];
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
    const out1: CVConnectionEntity = {cv: {id: 1, name: 'Out1', module: {id: 11, name: 'M'}, instance_id: 100}, kind: 'out'} as any;
    const inp1: CVConnectionEntity = {cv: {id: 2, name: 'In1', module: {id: 12, name: 'N'}, instance_id: 200}, kind: 'in'} as any;
    const out2: CVConnectionEntity = {cv: {id: 3, name: 'Out2', module: {id: 13, name: 'O'}, instance_id: 300}, kind: 'out'} as any;
    
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

});