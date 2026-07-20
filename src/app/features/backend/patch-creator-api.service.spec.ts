import { of } from 'rxjs';
import {
  PatchCreatorApiService,
  PatchCreatorPatchDraft
} from './patch-creator-api.service';
import { SupabaseService } from './supabase.service';

describe('PatchCreatorApiService', () => {
  function build() {
    const backend = {
      get: {
        currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([{id: 7, name: 'Studio Rack'}]))
      },
      add: {
        patch: jasmine.createSpy('patch').and.returnValue(of({data: [{id: 42}]}))
      }
    };

    return {
      backend,
      service: new PatchCreatorApiService(backend as unknown as SupabaseService)
    };
  }

  it('loads current user racks through the cached Supabase get boundary', (done) => {
    const {backend, service} = build();

    service.currentUserRacks().subscribe(racks => {
      expect(racks.map(rack => ({id: rack.id, name: rack.name}))).toEqual([{id: 7, name: 'Studio Rack'}]);
      expect(backend.get.currentUserRacks).toHaveBeenCalledOnceWith();
      done();
    });
  });

  it('creates patches through the Supabase add boundary', (done) => {
    const {backend, service} = build();
    const patchDraft: PatchCreatorPatchDraft = {
      name: 'Linked Patch',
      public: false,
      linked_rack_id: 19
    };

    service.createPatch(patchDraft).subscribe(response => {
      expect(response).toEqual({data: [{id: 42}]});
      expect(backend.add.patch).toHaveBeenCalledOnceWith(patchDraft);
      done();
    });
  });
});
