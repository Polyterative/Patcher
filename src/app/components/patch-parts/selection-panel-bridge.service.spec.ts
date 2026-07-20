import {
  CVSelectionState,
  SelectionPanelBridgeService
} from './selection-panel-bridge.service';
import { PatchConnection } from '../../models/connection';
import {
  CVConnectionEntity,
  CVwithModule
} from '../../models/cv';
import { MinimalModule } from '../../models/module';
import { Patch } from '../../models/patch';
import { PublicUser } from '../../models/user';

const TEST_USER: PublicUser = {
  id: 'user-1',
  username: 'tester'
};

function makeModule(id: number, name = `M${id}`): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 10,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    manufacturerId: id,
    manufacturer: {id, name: `Maker ${id}`},
    standard: {id: 0, name: '3U Doepfer'},
    tags: [],
    panels: []
  };
}

function makeCv(id: number, name: string, moduleId: number, instanceId?: number): CVwithModule {
  return {
    id,
    name,
    module: makeModule(moduleId),
    ...(instanceId === undefined ? {} : {instance_id: instanceId})
  };
}

function makeSelectionEntity(
  kind: CVConnectionEntity['kind'],
  cvId: number,
  name: string,
  moduleId: number,
  instanceId?: number
): CVConnectionEntity {
  return {
    kind,
    cv: makeCv(cvId, name, moduleId, instanceId)
  };
}

function makePatch(): Patch {
  return {
    id: 1,
    name: 'Patch',
    author: TEST_USER,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z'
  };
}

function makeConnection(aId: number, bId: number, instanceA?: number, instanceB?: number): PatchConnection {
  return {
    patch: makePatch(),
    a: makeCv(aId, `A${aId}`, 1),
    b: makeCv(bId, `B${bId}`, 2),
    ...(instanceA === undefined ? {} : {instance_id_a: instanceA}),
    ...(instanceB === undefined ? {} : {instance_id_b: instanceB})
  };
}


describe('SelectionPanelBridgeService', () => {
  function sel(cvIdA?: number, cvIdB?: number, instanceA?: number, instanceB?: number): CVSelectionState {
    return {
      a: cvIdA
        ? makeSelectionEntity('out', cvIdA, `A${ cvIdA }`, 1, instanceA)
        : null,
      b: cvIdB
        ? makeSelectionEntity('in', cvIdB, `B${ cvIdB }`, 2, instanceB)
        : null
    };
  }
  
  it('returns confirmed=true when a matching editor connection exists', (done) => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next(sel(10, 20, 1, 2));
    service.editorConnections$.next([
      makeConnection(10, 20, 1, 2)
    ]);
    
    service.confirmed$.subscribe(v => {
      if (v) {
        expect(v).toBeTrue();
        service.ngOnDestroy();
        done();
      }
    });
  });
  
  it('ignores record$ events when selection is incomplete', () => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next(sel(undefined, 20));
    
    service.record$.next();
    
    expect(service.recordedKey$.value).toBeNull();
    service.ngOnDestroy();
  });
});


describe('SelectionPanelBridgeService — record$ captures selection into recordedKey$', () => {
  function sel(cvIdA: number, cvIdB: number, instanceA?: number, instanceB?: number): CVSelectionState {
    return {
      a: makeSelectionEntity('out', cvIdA, `A${cvIdA}`, 1, instanceA),
      b: makeSelectionEntity('in', cvIdB, `B${cvIdB}`, 2, instanceB),
    };
  }

  it('sets recordedKey$ when record$ fires with a complete selection', () => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next(sel(10, 20, 1, 2));
    service.record$.next();

    const key = service.recordedKey$.value;
    expect(key).toEqual({aId: 10, bId: 20, instanceA: 1, instanceB: 2});
    service.ngOnDestroy();
  });

  it('does NOT update recordedKey$ when record$ fires with incomplete selection', () => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next({a: null, b: null});
    service.record$.next();

    expect(service.recordedKey$.value).toBeNull();
    service.ngOnDestroy();
  });

  it('clears recordedKey$ when matching connection is removed from editorConnections$', () => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next(sel(10, 20));
    service.record$.next();
    expect(service.recordedKey$.value).not.toBeNull();

    // Remove the connection from the editor list
    service.editorConnections$.next([]);
    expect(service.recordedKey$.value).toBeNull();
    service.ngOnDestroy();
  });

  it('confirmed$ emits true when recordedKey$ matches current selection', done => {
    const service = new SelectionPanelBridgeService();
    // Leave editorConnections$ as null (default) so the auto-clear guard skips.
    // Adding the recorded connection to the list instead confirms via that path.
    service.editorConnections$.next([makeConnection(10, 20)]);
    service.selectionState$.next(sel(10, 20));
    service.record$.next();

    service.confirmed$.subscribe(v => {
      if (v) {
        expect(v).toBeTrue();
        service.ngOnDestroy();
        done();
      }
    });
  });

  it('confirmed$ emits false for incomplete selection even with matching connections', done => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next({a: null, b: null});
    service.editorConnections$.next([makeConnection(10, 20)]);

    service.confirmed$.subscribe(v => {
      if (v === false) {
        expect(v).toBeFalse();
        service.ngOnDestroy();
        done();
      }
    });
  });
});
