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
