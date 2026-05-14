import { SelectionPanelOutletComponent } from './selection-panel-outlet.component';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';
import { Subject, BehaviorSubject } from 'rxjs';

function mockBridge(): SelectionPanelBridgeService {
  return {
    selectionState$: new BehaviorSubject({ a: null, b: null }),
    patchData$: new BehaviorSubject(undefined),
    instanceLabelMap$: new BehaviorSubject(new Map()),
    reset$: new Subject(),
    confirm$: new Subject()
  } as unknown as SelectionPanelBridgeService;
}

describe('SelectionPanelOutletComponent', () => {
  it('creates without error', () => {
    expect(() => new SelectionPanelOutletComponent(mockBridge())).not.toThrow();
  });

  it('exposes bridge service', () => {
    const bridge = mockBridge();
    const comp = new SelectionPanelOutletComponent(bridge);
    expect(comp.bridge).toBe(bridge);
  });
});
