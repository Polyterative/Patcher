import {
  firstValueFrom,
  of,
  throwError
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MinimalModule } from 'src/app/models/module';
import { RackCreatorDataService } from './rack-creator-data.service';

describe('RackCreatorDataService', () => {
  function build() {
    const backend = {
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(of({id: 'user-1'}))
      },
      GET: {
        publicModuleImportCandidates: jasmine.createSpy('publicModuleImportCandidates').and.returnValue(of([]))
      },
      add: {
        rack: jasmine.createSpy('rack').and.returnValue(of({data: [{id: 42}]})),
        rackModule: jasmine.createSpy('rackModule').and.returnValues(
          of({data: [{id: 1}]}),
          throwError(() => new Error('placement failed'))
        )
      },
      delete: {
        modulesOfRack: jasmine.createSpy('modulesOfRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('userRack').and.returnValue(of({}))
      }
    };

    return {
      service: new RackCreatorDataService(backend as unknown as SupabaseService),
      backend
    };
  }

  it('rolls back the created rack when any imported module placement fails', async () => {
    const {service, backend} = build();

    await expectAsync(firstValueFrom(service.createRackWithPlacements$({
      name: 'Import',
      hp: 84,
      rows: 1,
      public: true,
      locked: false
    }, [
      {moduleId: 1, row: 0, column: 0, sourceKey: '1:1:0'},
      {moduleId: 2, row: 0, column: 6, sourceKey: '1:7:1'}
    ]))).toBeRejectedWithError('Rack import rolled back after 1 placement failure(s).');

    expect(backend.delete.modulesOfRack).toHaveBeenCalledWith(42);
    expect(backend.delete.userRack).toHaveBeenCalledWith(42);
  });

  it('exposes the current user session through the data service boundary', async () => {
    const {service, backend} = build();

    const user = await firstValueFrom(service.getUserSession$());

    expect(user).toEqual(jasmine.objectContaining({id: 'user-1'}));
    expect(backend.auth.getUserSession$).toHaveBeenCalledTimes(1);
  });

  it('creates a manual rack through the backend boundary with normalized result shape', async () => {
    const {service, backend} = build();

    const rackDraft = {
      name: 'Manual',
      hp: 84,
      rows: 2,
      public: true,
      locked: false
    };
    const result = await firstValueFrom(service.createRack$(rackDraft));

    expect(backend.add.rack).toHaveBeenCalledOnceWith(rackDraft);
    expect(result).toEqual({
      rackId: 42,
      placementSummary: {
        placed: 0,
        failed: 0
      }
    });
  });

  it('loads bounded public candidates for ModularGrid import matching', async () => {
    const {service, backend} = build();
    backend.GET.publicModuleImportCandidates.and.returnValue(of([
      {id: 1, name: 'ST MIX', hp: 4} as MinimalModule
    ]));

    const fallbackModules = [
      {id: 3, name: 'Owned fallback', hp: 8} as MinimalModule
    ];
    const modules = await firstValueFrom(service.loadModuleCatalogue$(fallbackModules, [{
      key: '1:1:0',
      mgId: 1001,
      name: 'Bef Aco STMix',
      row: 1,
      col: 1,
      inferredHp: 4
    }]));

    expect(modules.map(module => module.id)).toEqual([3, 1]);
    expect(backend.GET.publicModuleImportCandidates).toHaveBeenCalledOnceWith(jasmine.arrayContaining([
      'stmix',
      'st mix'
    ]));
  });
});
