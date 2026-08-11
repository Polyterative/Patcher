import { of, throwError } from 'rxjs';
import { PatchGraphModule } from 'src/app/components/patch-parts/patch-graph/patch-graph-build.models';
import { PatchGraphApiService } from './patch-graph-api.service';
import { SupabaseService } from './supabase.service';

function makeModule(id: number): PatchGraphModule {
  return {id, name: `Module ${ id }`, ins: [], outs: []};
}

describe('PatchGraphApiService', () => {
  let backend: SupabaseService;
  let modulesByIdsForPatchGraph: jasmine.Spy;
  let service: PatchGraphApiService;

  beforeEach(() => {
    modulesByIdsForPatchGraph = jasmine.createSpy('modulesByIdsForPatchGraph');
    backend = {
      GET: {
        modulesByIdsForPatchGraph
      }
    } as unknown as SupabaseService;
    service = new PatchGraphApiService(backend);
  });

  it('delegates batch module hydration to the cached Supabase GET boundary', (done) => {
    modulesByIdsForPatchGraph.and.returnValue(of({data: [makeModule(10), makeModule(20)]}));

    service.modulesByIds([10, 20]).subscribe(modules => {
      expect(modules.map(module => module.id)).toEqual([10, 20]);
      expect(modulesByIdsForPatchGraph).toHaveBeenCalledOnceWith([10, 20]);
      done();
    });
  });

  it('resolves to an empty array when the batch response has no data', (done) => {
    modulesByIdsForPatchGraph.and.returnValue(of({data: null}));

    service.modulesByIds([404]).subscribe(modules => {
      expect(modules).toEqual([]);
      done();
    });
  });

  it('propagates Supabase response errors instead of treating them as missing modules', (done) => {
    const error = new Error('module lookup failed');
    modulesByIdsForPatchGraph.and.returnValue(of({data: null, error}));

    service.modulesByIds([404]).subscribe({
      error: received => {
        expect(received).toBe(error);
        done();
      }
    });
  });

  it('propagates backend lookup failures', (done) => {
    const error = new Error('lookup failed');
    modulesByIdsForPatchGraph.and.returnValue(throwError(() => error));

    service.modulesByIds([99]).subscribe({
      error: received => {
        expect(received).toBe(error);
        done();
      }
    });
  });
});
