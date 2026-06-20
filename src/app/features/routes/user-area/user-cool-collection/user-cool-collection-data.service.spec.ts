import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  REACTION_KIND_COOL,
  ReactionEntityTypes,
  type ReactionRow
} from 'src/app/features/backend/supabase-reactions';
import { MinimalModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { UserCoolCollectionDataService } from './user-cool-collection-data.service';

const moduleOne = {
  id: 1,
  name: 'Alpha',
  description: 'First module',
  hp: 8,
  public: true,
  manufacturer: {id: 1, name: 'Maker'},
  manufacturerId: 1,
  standard: {id: 1, name: 'Eurorack'},
  tags: [],
  panels: [],
  created: '2026-06-01T00:00:00.000Z',
  updated: '2026-06-01T00:00:00.000Z'
} as MinimalModule;

const moduleTwo = {
  ...moduleOne,
  id: 2,
  name: 'Beta'
} as MinimalModule;

const rackOne = {
  id: 10,
  name: 'Rack One',
  description: 'First rack',
  hp: 104,
  rows: 3,
  public: true,
  locked: false,
  author: {id: 'author-1', username: 'maker'},
  created: '2026-06-01T00:00:00.000Z',
  updated: '2026-06-01T00:00:00.000Z',
  public_id: 'rack-one'
} as Rack;

const patchOne = {
  id: 20,
  name: 'Patch One',
  description: 'First patch',
  public: true,
  author: {id: 'author-1', username: 'maker'},
  created: '2026-06-01T00:00:00.000Z',
  updated: '2026-06-01T00:00:00.000Z',
  public_id: 'patch-one',
  tags: []
} as Patch;

function reaction(entityType: number, entityId: number, createdAt: string): ReactionRow {
  return {
    user_id: 'user-1',
    entity_type: entityType,
    entity_id: entityId,
    kind: REACTION_KIND_COOL,
    created_at: createdAt
  };
}

function backendMock(overrides: {
  reactions?: ReactionRow[];
  modules?: MinimalModule[];
  racks?: Rack[];
  patches?: Patch[];
  deleteFails?: boolean;
} = {}): SupabaseService {
  const reactions = overrides.reactions ?? [];
  return {
    get: {
      currentUserReactions: jasmine.createSpy('currentUserReactions').and.callFake((entityType?: number) =>
        of(entityType === undefined
          ? reactions
          : reactions.filter(current => current.entity_type === entityType)
        )
      ),
      publicRacksByIds: jasmine.createSpy('publicRacksByIds').and.returnValue(of(overrides.racks ?? []))
    },
    GET: {
      publicModulesByIds: jasmine.createSpy('publicModulesByIds').and.returnValue(of(overrides.modules ?? [])),
      publicPatchesByIds: jasmine.createSpy('publicPatchesByIds').and.returnValue(of(overrides.patches ?? []))
    },
    delete: {
      reaction: jasmine.createSpy('reaction').and.returnValue(overrides.deleteFails
        ? throwError(() => new Error('failed'))
        : of([])
      )
    }
  } as unknown as SupabaseService;
}

function snackBarMock(): MatSnackBar {
  return {
    open: jasmine.createSpy('open')
  } as unknown as MatSnackBar;
}

describe('UserCoolCollectionDataService', () => {
  it('does not call Cool backend reads when the feature is disabled', async () => {
    const backend = backendMock();
    const service = new UserCoolCollectionDataService(backend, snackBarMock(), false);

    service.load$.next('module');
    const vm = await firstValueFrom(service.vm$);

    expect(vm.enabled).toBeFalse();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.GET.publicModulesByIds).not.toHaveBeenCalled();
    expect(backend.GET.publicPatchesByIds).not.toHaveBeenCalled();
    expect(backend.get.publicRacksByIds).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });

  it('loads only cooled modules for the module Cool section', async () => {
    const backend = backendMock({
      reactions: [
        reaction(ReactionEntityTypes.MODULE, 1, '2026-06-19T08:00:00.000Z'),
        reaction(ReactionEntityTypes.RACK, 10, '2026-06-19T10:00:00.000Z'),
        reaction(ReactionEntityTypes.MODULE, 2, '2026-06-19T11:00:00.000Z'),
        reaction(ReactionEntityTypes.PATCH, 20, '2026-06-19T12:00:00.000Z')
      ],
      modules: [moduleOne, moduleTwo],
      racks: [rackOne],
      patches: [patchOne]
    });
    const service = new UserCoolCollectionDataService(backend, snackBarMock(), true);

    service.load$.next('module');
    const vm = await firstValueFrom(service.vm$);

    expect(vm.total).toBe(2);
    expect(vm.groups.map(group => group.entityType)).toEqual(['module']);
    expect(vm.groups[0].items.map(item => item.entityId)).toEqual([2, 1]);
    expect(backend.get.currentUserReactions).toHaveBeenCalledWith(ReactionEntityTypes.MODULE, REACTION_KIND_COOL);
    expect(backend.GET.publicModulesByIds).toHaveBeenCalledOnceWith([2, 1]);
    expect(backend.get.publicRacksByIds).not.toHaveBeenCalled();
    expect(backend.GET.publicPatchesByIds).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });

  it('loads only cooled racks for the rack Cool section', async () => {
    const backend = backendMock({
      reactions: [
        reaction(ReactionEntityTypes.MODULE, 1, '2026-06-19T08:00:00.000Z'),
        reaction(ReactionEntityTypes.RACK, 10, '2026-06-19T10:00:00.000Z')
      ],
      modules: [moduleOne],
      racks: [rackOne]
    });
    const service = new UserCoolCollectionDataService(backend, snackBarMock(), true);

    service.load$.next('rack');
    const vm = await firstValueFrom(service.vm$);

    expect(vm.total).toBe(1);
    expect(vm.groups.map(group => group.entityType)).toEqual(['rack']);
    expect(vm.groups[0].items.map(item => item.entityId)).toEqual([10]);
    expect(backend.get.currentUserReactions).toHaveBeenCalledWith(ReactionEntityTypes.RACK, REACTION_KIND_COOL);
    expect(backend.get.publicRacksByIds).toHaveBeenCalledOnceWith([10]);
    expect(backend.GET.publicModulesByIds).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });

  it('loads only cooled patches for the patch Cool section', async () => {
    const backend = backendMock({
      reactions: [
        reaction(ReactionEntityTypes.PATCH, 20, '2026-06-19T12:00:00.000Z')
      ],
      patches: [patchOne]
    });
    const service = new UserCoolCollectionDataService(backend, snackBarMock(), true);

    service.load$.next('patch');
    const vm = await firstValueFrom(service.vm$);

    expect(vm.total).toBe(1);
    expect(vm.groups.map(group => group.entityType)).toEqual(['patch']);
    expect(vm.groups[0].items.map(item => item.entityId)).toEqual([20]);
    expect(backend.get.currentUserReactions).toHaveBeenCalledWith(ReactionEntityTypes.PATCH, REACTION_KIND_COOL);
    expect(backend.GET.publicPatchesByIds).toHaveBeenCalledOnceWith([20]);
    expect(backend.GET.publicModulesByIds).not.toHaveBeenCalled();
    expect(backend.get.publicRacksByIds).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });

  it('removes a cooled item inline through the reaction delete endpoint', async () => {
    const backend = backendMock({
      reactions: [reaction(ReactionEntityTypes.MODULE, 1, '2026-06-19T08:00:00.000Z')],
      modules: [moduleOne],
      racks: []
    });
    const service = new UserCoolCollectionDataService(backend, snackBarMock(), true);

    service.load$.next('module');
    let vm = await firstValueFrom(service.vm$);
    const item = vm.groups[0].items[0];

    service.removeCool$.next(item);
    vm = await firstValueFrom(service.vm$);

    expect(vm.total).toBe(0);
    expect(backend.delete.reaction).toHaveBeenCalledOnceWith(
      ReactionEntityTypes.MODULE,
      1,
      REACTION_KIND_COOL
    );
    service.ngOnDestroy();
  });

  it('restores only the failed item when overlapping removals fail', async () => {
    const firstDelete$ = new Subject<never[]>();
    const secondDelete$ = new Subject<never[]>();
    const backend = backendMock({
      reactions: [
        reaction(ReactionEntityTypes.MODULE, 1, '2026-06-19T08:00:00.000Z'),
        reaction(ReactionEntityTypes.MODULE, 2, '2026-06-19T09:00:00.000Z')
      ],
      modules: [moduleOne, moduleTwo],
      racks: []
    });
    (backend.delete.reaction as jasmine.Spy).and.returnValues(firstDelete$, secondDelete$);
    const service = new UserCoolCollectionDataService(backend, snackBarMock(), true);

    service.load$.next('module');
    let vm = await firstValueFrom(service.vm$);
    const olderItem = vm.groups[0].items.find(item => item.entityId === 1);
    const newerItem = vm.groups[0].items.find(item => item.entityId === 2);
    expect(olderItem).toBeDefined();
    expect(newerItem).toBeDefined();

    service.removeCool$.next(olderItem!);
    service.removeCool$.next(newerItem!);
    vm = await firstValueFrom(service.vm$);
    expect(vm.total).toBe(0);

    firstDelete$.complete();
    secondDelete$.error(new Error('failed'));
    vm = await firstValueFrom(service.vm$);

    expect(vm.total).toBe(1);
    expect(vm.groups[0].items.map(item => item.entityId)).toEqual([2]);
    service.ngOnDestroy();
  });
});
