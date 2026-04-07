import {
  EditorModuleCard,
  PatchEditorComponent
} from './patch-editor.component';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';


function fakeModule(id: number, name = `Mod${ id }`): DbModule {
  return {id, name, manufacturer: {name: 'Maker'}} as any;
}

function fakeInstance(id: number, moduleId: number, label: string | null = null): PatchModuleInstance {
  return {id, patch_id: 1, module_id: moduleId, instance_label: label};
}

function fakeConnection(instanceIdA: number, instanceIdB: number): PatchConnection {
  return {
    a: {id: 100, name: 'Out', module: {id: 10, name: 'ModA'}} as any,
    b: {id: 200, name: 'In', module: {id: 20, name: 'ModB'}} as any,
    patch: {id: 1} as any,
    instance_id_a: instanceIdA,
    instance_id_b: instanceIdB
  };
}


describe('PatchEditorComponent.buildEditorCards (via private access)', () => {
  function buildComponent(): PatchEditorComponent {
    return new PatchEditorComponent({} as any, {} as any, {} as any);
  }
  
  it('module with 0 instances produces one card with no instanceId and negative trackingId', () => {
    const comp = buildComponent();
    const module = fakeModule(5);
    const cards = (comp as any).buildEditorCards([module], [], []);
    
    expect(cards.length).toBe(1);
    expect(cards[0].instance).toBeUndefined();
    expect(cards[0].trackingId).toBe(-5);
    expect(cards[0].label).toBeUndefined();
    expect(cards[0].instanceCount).toBe(0);
  });
  
  it('module with 1 instance produces one card with instanceId set and no label', () => {
    const comp = buildComponent();
    const module = fakeModule(5);
    const instance = fakeInstance(100, 5);
    const cards = (comp as any).buildEditorCards([module], [instance], []);
    
    expect(cards.length).toBe(1);
    expect(cards[0].instance).toBe(instance);
    expect(cards[0].trackingId).toBe(100);
    expect(cards[0].label).toBeUndefined();
    expect(cards[0].instanceCount).toBe(1);
  });
  
  it('module with 2 instances produces 2 cards with labels', () => {
    const comp = buildComponent();
    const module = fakeModule(5);
    const inst1 = fakeInstance(100, 5);
    const inst2 = fakeInstance(101, 5);
    const cards = (comp as any).buildEditorCards([module], [inst1, inst2], []);
    
    expect(cards.length).toBe(2);
    expect(cards[0].trackingId).toBe(100);
    expect(cards[1].trackingId).toBe(101);
    // Labels default to (1) and (2)
    expect(cards[0].label).toBe('(1)');
    expect(cards[1].label).toBe('(2)');
    expect(cards[0].instanceCount).toBe(2);
  });
  
  it('uses instance_label when it is set (multi-instance)', () => {
    const comp = buildComponent();
    const module = fakeModule(5);
    const inst1 = fakeInstance(100, 5, 'LFO');
    const inst2 = fakeInstance(101, 5, 'VCO');
    const cards = (comp as any).buildEditorCards([module], [inst1, inst2], []);
    
    expect(cards[0].label).toBe('LFO');
    expect(cards[1].label).toBe('VCO');
  });
  
  it('connectionCount is computed correctly for single-instance module', () => {
    const comp = buildComponent();
    const module = fakeModule(10);
    const instance = fakeInstance(99, 10);
    const connections = [fakeConnection(99, 200), fakeConnection(99, 300)];
    const cards = (comp as any).buildEditorCards([module], [instance], connections);
    
    expect(cards[0].connectionCount).toBe(2);
  });
  
  it('modules with no matching instances in list still get 0-instance card', () => {
    const comp = buildComponent();
    const mod1 = fakeModule(1);
    const mod2 = fakeModule(2);
    const inst = fakeInstance(10, 1); // only mod1 has instance
    const cards = (comp as any).buildEditorCards([mod1, mod2], [inst], []);
    
    expect(cards.length).toBe(2);
    const mod2card = cards.find((c: EditorModuleCard) => c.module.id === 2)!;
    expect(mod2card.instanceCount).toBe(0);
    expect(mod2card.trackingId).toBe(-2);
  });
});


describe('PatchEditorComponent.buildConnectionNames (via private access)', () => {
  function buildComponent(): PatchEditorComponent {
    return new PatchEditorComponent({} as any, {} as any, {} as any);
  }
  
  it('returns empty array when instanceId is undefined', () => {
    const comp = buildComponent();
    const result = (comp as any).buildConnectionNames([fakeConnection(1, 2)], undefined);
    expect(result).toEqual([]);
  });
  
  it('returns empty array when there are no connections', () => {
    const comp = buildComponent();
    const result = (comp as any).buildConnectionNames([], 10);
    expect(result).toEqual([]);
  });
  
  it('builds "thisCv → otherModule: otherCv" format for connections', () => {
    const comp = buildComponent();
    const conn = fakeConnection(10, 20);
    const result = (comp as any).buildConnectionNames([conn], 10);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('→');
  });
  
  it('adds "… and N more" suffix when connections exceed 10', () => {
    const comp = buildComponent();
    const conns = Array.from({length: 12}, (_, i) => fakeConnection(100, i + 200));
    const result = (comp as any).buildConnectionNames(conns, 100);
    expect(result.length).toBe(11);
    expect(result[10]).toContain('2 more');
  });
});