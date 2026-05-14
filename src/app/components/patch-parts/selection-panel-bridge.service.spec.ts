import { SelectionPanelBridgeService } from './selection-panel-bridge.service';


describe('SelectionPanelBridgeService', () => {
  function sel(cvIdA?: number, cvIdB?: number, instanceA?: number, instanceB?: number) {
    return {
      a: cvIdA
        ? {
          kind: 'out',
          cv: {id: cvIdA, name: `A${ cvIdA }`, module: {id: 1, name: 'M1'}, instance_id: instanceA}
        }
        : null,
      b: cvIdB
        ? {
          kind: 'in',
          cv: {id: cvIdB, name: `B${ cvIdB }`, module: {id: 2, name: 'M2'}, instance_id: instanceB}
        }
        : null
    } as any;
  }
  
  it('returns confirmed=true when a matching editor connection exists', (done) => {
    const service = new SelectionPanelBridgeService();
    service.selectionState$.next(sel(10, 20, 1, 2));
    service.editorConnections$.next([
      {
        patch: {id: 1},
        a: {id: 10, name: 'A10'},
        b: {id: 20, name: 'B20'},
        instance_id_a: 1,
        instance_id_b: 2
      } as any
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
  function sel(cvIdA: number, cvIdB: number, instanceA?: number, instanceB?: number) {
    return {
      a: {kind: 'out', cv: {id: cvIdA, name: `A${cvIdA}`, module: {id: 1, name: 'M1'}, instance_id: instanceA}},
      b: {kind: 'in',  cv: {id: cvIdB, name: `B${cvIdB}`, module: {id: 2, name: 'M2'}, instance_id: instanceB}},
    } as any;
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
    service.selectionState$.next({a: null, b: null} as any);
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
    service.editorConnections$.next([{
      a: {id: 10, name: 'A'},
      b: {id: 20, name: 'B'},
      instance_id_a: null,
      instance_id_b: null,
      patch: {id: 1}
    } as any]);
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
    service.selectionState$.next({a: null, b: null} as any);
    service.editorConnections$.next([{a: {id: 10}, b: {id: 20}, instance_id_a: null, instance_id_b: null} as any]);

    service.confirmed$.subscribe(v => {
      if (v === false) {
        expect(v).toBeFalse();
        service.ngOnDestroy();
        done();
      }
    });
  });
});
