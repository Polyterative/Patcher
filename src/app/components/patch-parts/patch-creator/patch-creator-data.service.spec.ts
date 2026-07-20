import { of } from 'rxjs';
import { PatchCreatorApiService } from 'src/app/features/backend/patch-creator-api.service';
import { PatchCreatorDataService } from './patch-creator-data.service';

describe('PatchCreatorDataService', () => {
  function build() {
    const patchCreatorApi = {
      currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([{id: 7, name: 'Studio Rack'}])),
      createPatch: jasmine.createSpy('createPatch').and.returnValue(of({data: [{id: 42}]}))
    };

    return {
      patchCreatorApi,
      service: new PatchCreatorDataService(patchCreatorApi as unknown as PatchCreatorApiService)
    };
  }

  it('loads current user racks from the patch creator API boundary', (done) => {
    const {patchCreatorApi, service} = build();

    service.currentUserRacks$().subscribe(racks => {
      expect(racks.map(rack => ({id: rack.id, name: rack.name}))).toEqual([{id: 7, name: 'Studio Rack'}]);
      expect(patchCreatorApi.currentUserRacks).toHaveBeenCalledOnceWith();
      done();
    });
  });

  it('creates patches from a component-facing draft', (done) => {
    const {patchCreatorApi, service} = build();
    const patchDraft = {
      name: 'Linked Patch',
      public: false,
      linked_rack_id: 19
    };

    service.createPatch$(patchDraft).subscribe(response => {
      expect(response).toEqual({data: [{id: 42}]});
      expect(patchCreatorApi.createPatch).toHaveBeenCalledOnceWith(patchDraft);
      done();
    });
  });
});
