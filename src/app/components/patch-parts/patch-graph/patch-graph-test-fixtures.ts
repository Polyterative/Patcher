import { CV, CVwithModule } from 'src/app/models/cv';
import { DbModule, MinimalModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';

export function minimalModuleFixture(id: number, name = `Module ${ id }`): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 8,
    public: true,
    manufacturer: {id, name: `Maker ${ id }`},
    manufacturerId: id,
    standard: {id: 0, name: 'Eurorack'},
    tags: [],
    panels: [],
    created: '',
    updated: ''
  };
}

export function dbModuleFixture(
  id: number,
  name = `Module ${ id }`,
  ins: CV[] = [],
  outs: CV[] = []
): DbModule {
  return {
    ...minimalModuleFixture(id, name),
    ins,
    outs,
    switches: [],
    manualURL: '',
    store_url: null,
    additional: null,
    isComplete: true,
    isApproved: true,
    isDIY: false,
    powerPos12: null,
    powerNeg12: null,
    powerPos5: null,
    depth: 0,
    weight: 0
  };
}

export function cvWithModuleFixture(
  id: number,
  moduleId: number,
  moduleName = `Module ${ moduleId }`,
  name = `CV ${ id }`
): CVwithModule {
  return {
    id,
    name,
    module: minimalModuleFixture(moduleId, moduleName)
  };
}

export function patchFixture(id = 1, overrides: Partial<Patch> = {}): Patch {
  return {
    id,
    name: `Patch ${ id }`,
    author: {id: 'user-1', username: 'patcher'},
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

export function graphNodeFixture(
  id: string,
  type: string,
  parentModuleNodeId?: string,
  label = id
): GraphNode {
  return {
    id,
    label,
    color: '#ffffff',
    size: 1,
    x: 0,
    y: 0,
    data: {type, parentModuleNodeId}
  };
}

export function graphEdgeFixture(id: string, from: string, to: string, stage: string): GraphEdge {
  return {
    id,
    from,
    to,
    label: '',
    color: '#ffffff',
    size: 1,
    type: 'arrow',
    data: {stage}
  };
}
