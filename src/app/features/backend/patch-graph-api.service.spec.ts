import { of, throwError } from 'rxjs';
import { DbModule } from 'src/app/models/module';
import { PatchGraphApiService } from './patch-graph-api.service';
import { SupabaseService } from './supabase.service';

function makeModule(id: number): DbModule {
  return {id, name: `Module ${ id }`} as DbModule;
}

describe('PatchGraphApiService', () => {
  let backend: SupabaseService;
  let moduleWithId: jasmine.Spy;
  let service: PatchGraphApiService;

  beforeEach(() => {
    moduleWithId = jasmine.createSpy('moduleWithId');
    backend = {
      GET: {
        moduleWithId
      }
    } as unknown as SupabaseService;
    service = new PatchGraphApiService(backend);
  });

  it('delegates module hydration to the cached Supabase GET boundary', (done) => {
    moduleWithId.and.returnValue(of({data: makeModule(42)}));

    service.moduleWithId(42).subscribe(module => {
      expect(module.id).toBe(42);
      expect(moduleWithId).toHaveBeenCalledOnceWith(42);
      done();
    });
  });

  it('preserves nullable module responses for best-effort graph hydration', (done) => {
    moduleWithId.and.returnValue(of({data: null}));

    service.moduleWithId(404).subscribe(module => {
      expect(module).toBeNull();
      done();
    });
  });

  it('propagates Supabase response errors instead of treating them as missing modules', (done) => {
    const error = new Error('module lookup failed');
    moduleWithId.and.returnValue(of({data: null, error}));

    service.moduleWithId(404).subscribe({
      error: received => {
        expect(received).toBe(error);
        done();
      }
    });
  });

  it('propagates backend lookup failures', (done) => {
    const error = new Error('lookup failed');
    moduleWithId.and.returnValue(throwError(() => error));

    service.moduleWithId(99).subscribe({
      error: received => {
        expect(received).toBe(error);
        done();
      }
    });
  });
});
