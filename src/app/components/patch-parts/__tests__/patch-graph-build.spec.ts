import { PatchConnection } from 'src/app/models/connection';
import {
  CV,
  CVwithModule
} from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import {
  buildPatchGraphData,
  computePatchGraphSizeConstant
} from '../patch-graph/patch-graph-build.utils';


const palette = {
  moduleColor: '#8974E4',
  cvOutColor: '#E2523C',
  cvInColor: '#4483F2',
  moduleJackEdgeColor: 'rgba(137, 116, 228, 0.58)',
  patchCableBaseColor: '#93A0B1'
};

function makeCv(id: number, name: string): CV {
  return {
    id,
    name
  };
}

function makeModule(id: number, name: string, ins: CV[], outs: CV[]): DbModule {
  return {
    id,
    name,
    ins,
    outs
  } as DbModule;
}

function makeCVwithModule(cvId: number, moduleId: number, moduleName: string): CVwithModule {
  return {
    id: cvId,
    name: `CV ${ cvId }`,
    module: {
      id: moduleId,
      name: moduleName
    } as any
  };
}

function makeConnection(
  aCv: number,
  aModule: number,
  aModuleName: string,
  bCv: number,
  bModule: number,
  bModuleName: string,
  instanceA?: number,
  instanceB?: number
): PatchConnection {
  return {
    a: makeCVwithModule(aCv, aModule, aModuleName),
    b: makeCVwithModule(bCv, bModule, bModuleName),
    patch: {id: 1} as Patch,
    instance_id_a: instanceA,
    instance_id_b: instanceB
  };
}


describe('patch-graph-build utils', () => {
  it('clamps computed size constant into the expected bounds', () => {
    expect(computePatchGraphSizeConstant(0, 0)).toBe(5);
    expect(computePatchGraphSizeConstant(100, 1)).toBe(6);
    expect(computePatchGraphSizeConstant(1, 100)).toBe(1.5);
  });
  
  it('builds patch graph with deduped module bridges and unique route occurrences', () => {
    const moduleA = makeModule(10, 'A', [makeCv(2, 'in2')], [makeCv(1, 'out1'), makeCv(3, 'out3')]);
    const moduleB = makeModule(20, 'B', [makeCv(4, 'in4')], [makeCv(5, 'out5')]);
    
    const connections = [
      makeConnection(1, 10, 'A', 4, 20, 'B', 101, undefined),
      makeConnection(1, 10, 'A', 4, 20, 'B', 101, undefined)
    ];
    
    const result = buildPatchGraphData({
      connections,
      modules: [moduleA, moduleB],
      sizeConstant: 5,
      palette
    });
    
    const patchEdgeIds = result.edges
      .filter(edge => edge.data?.stage === 'cv-out-to-cv-in')
      .map(edge => edge.id)
      .sort();
    expect(patchEdgeIds).toEqual([
      'patch:10_1011->204#1',
      'patch:10_1011->204#2'
    ]);
    
    const moduleBridgeEdges = result.edges.filter(edge => edge.data?.stage === 'module-bridge');
    expect(moduleBridgeEdges.length).toBe(1);
    expect(moduleBridgeEdges[0].id).toBe('module-bridge:10_101->20');
    
    const moduleNode = result.nodes.find(node => node.id === '10_101');
    expect(moduleNode?.label).toContain('A');
  });
});