import { of } from 'rxjs';
import { PatchGraphApiService } from 'src/app/features/backend/patch-graph-api.service';
import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { Patch } from 'src/app/models/patch';
import { PatchGraphModule } from './patch-graph-build.models';
import { PatchGraphDataService } from './patch-graph-data.service';

function makeCV(id: number, moduleId: number): CVwithModule {
  return {
    id,
    name: `CV ${ id }`,
    module: {
      id: moduleId,
      name: `M${ moduleId }`,
      description: '',
      hp: 8,
      public: true,
      manufacturer: {id: moduleId, name: `Maker ${ moduleId }`},
      manufacturerId: moduleId,
      standard: {id: 0, name: 'Eurorack'},
      tags: [],
      panels: [],
      created: '',
      updated: ''
    }
  };
}

function makeConnection(
  outModuleId: number,
  inModuleId: number,
  instanceIdA?: number,
  instanceIdB?: number
): PatchConnection {
  return {
    a: makeCV(outModuleId * 10, outModuleId),
    b: makeCV(inModuleId * 10, inModuleId),
    patch: {id: 1} as Patch,
    instance_id_a: instanceIdA,
    instance_id_b: instanceIdB
  };
}

function makeModule(id: number): PatchGraphModule {
  return {id, name: `Module ${ id }`, ins: [], outs: []};
}

describe('PatchGraphDataService', () => {
  let api: jasmine.SpyObj<PatchGraphApiService>;
  let service: PatchGraphDataService;

  beforeEach(() => {
    api = jasmine.createSpyObj<PatchGraphApiService>('PatchGraphApiService', ['modulesByIds']);
    api.modulesByIds.and.callFake((ids: number[]) => of(ids.map(id => makeModule(id))));
    service = new PatchGraphDataService(api);
  });

  it('dedupes unique module ids and calls the batch method once', (done) => {
    const connections = [
      makeConnection(10, 20),
      makeConnection(10, 30),
      makeConnection(20, 10, 1, 2)
    ];

    service.modulesForConnections(connections).subscribe(modules => {
      expect(api.modulesByIds).toHaveBeenCalledOnceWith([10, 20, 30]);
      expect(modules.map(module => module.id)).toEqual([10, 20, 30]);
      done();
    });
  });

  it('returns whatever the batch call resolves to', (done) => {
    const batchResult = [makeModule(10), makeModule(20)];
    api.modulesByIds.and.returnValue(of(batchResult));

    service.modulesForConnections([makeConnection(10, 20)]).subscribe(modules => {
      expect(modules).toBe(batchResult);
      done();
    });
  });

  it('passes through a batch result that omits a missing/deleted module id', (done) => {
    api.modulesByIds.and.callFake((ids: number[]) => of(
      ids.filter(id => id !== 20).map(id => makeModule(id))
    ));

    service.modulesForConnections([makeConnection(10, 20)]).subscribe(modules => {
      expect(modules.map(module => module.id)).toEqual([10]);
      done();
    });
  });
});
