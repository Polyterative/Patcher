import { SupabaseService } from '../../supabase.service';
import { TagType } from 'src/app/models/tag';
import type {
  DbModule,
  MinimalModule,
  RackedModule
} from 'src/app/models/module';
import { firstValueFrom } from 'rxjs';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  chainable,
  getSupabaseClientDouble,
  type QueryListRowsResult,
  type QuerySingleRowResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type ManufacturerRow = Pick<SupabaseTableRow<'manufacturers'>, 'id' | 'name'>;
type PatchDetailRow = Pick<SupabaseTableRow<'patches'>, 'id' | 'linked_rack_id' | 'name'> & {
  author: { id: string };
};
type ProfileByUsernameRow = Pick<SupabaseTableRow<'profiles'>, 'avatar_url' | 'id' | 'public' | 'username' | 'website'>;
type ProfileRow = Pick<SupabaseTableRow<'profiles'>, 'id' | 'username'>;
type RackModuleRawRow = Pick<SupabaseTableRow<'rack_modules'>, 'column' | 'id' | 'moduleid' | 'rackid' | 'row'> &
  Partial<Pick<SupabaseTableRow<'rack_modules'>, 'orientation' | 'selected_panel_id'>> & {
    module: Partial<DbModule>;
  };
type StandardRow = SupabaseTableRow<'standards'>;

describe('SupabaseService - get simple queries', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  describe('get.standards', () => {
    it('should return data from the standards table', (done) => {
      const mockData = [{id: 0, name: '3U'}, {id: 1, name: 'Intellijel 1U'}] satisfies StandardRow[];
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<StandardRow>({data: mockData, error: null} satisfies QueryListRowsResult<StandardRow>)
      );

      service.get.standards().subscribe({
        next: (result: QueryListRowsResult<StandardRow>) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should query the correct table', (done) => {
      const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
        chainable<StandardRow>({data: [], error: null} satisfies QueryListRowsResult<StandardRow>)
      );

      service.get.standards().subscribe({
        next: () => {
          expect(fromSpy).toHaveBeenCalled();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('get.manufacturerWithId', () => {
    it('should resolve with the manufacturer data', (done) => {
      const mockData = {id: 5, name: 'Mutable Instruments'} satisfies ManufacturerRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<ManufacturerRow>({data: mockData, error: null} satisfies QuerySingleRowResult<ManufacturerRow>)
      );

      service.get.manufacturerWithId(5).subscribe({
        next: (result: QuerySingleRowResult<ManufacturerRow>) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should use default pagination parameters', (done) => {
      const mock: SupabaseQueryChain<ManufacturerRow> = chainable<ManufacturerRow>({
        data: {id: 1, name: 'Make Noise'},
        error: null
      } satisfies QuerySingleRowResult<ManufacturerRow>);
      const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.manufacturerWithId(1).subscribe({
        next: () => {
          expect(rangeSpy).toHaveBeenCalled();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('get.userWithId', () => {
    it('should resolve with user profile data', (done) => {
      const mockData = {id: 'user-42', username: 'patcher_fan'} satisfies ProfileRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<ProfileRow>({data: mockData, error: null} satisfies QuerySingleRowResult<ProfileRow>)
      );

      service.get.userWithId('user-42').subscribe({
        next: (result: QuerySingleRowResult<ProfileRow>) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.publicModulesByIds', () => {
    it('falls back by default and throws in strict mode when Supabase returns an error response for public modules by ids', async () => {
      const transientError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      };
      spyOn(supabaseClient, 'from').and.returnValue(chainable<MinimalModule>({data: null, error: transientError}));

      await expectAsync(firstValueFrom(service.GET.publicModulesByIds([7001]))).toBeResolvedTo([]);
      await expectAsync(firstValueFrom(service.GET.publicModulesByIds([7001], true))).toBeRejectedWith(transientError);
    });

    it('returns an empty array for successful empty public module responses', async () => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<MinimalModule>({data: [], error: null} satisfies QueryListRowsResult<MinimalModule>)
      );

      await expectAsync(firstValueFrom(service.GET.publicModulesByIds([7002]))).toBeResolvedTo([]);
    });

    it('loads public minimal modules by id with existing module joins', (done) => {
      const mockData: MinimalModule[] = [
        {
          id: 5,
          name: 'Maths',
          description: '',
          hp: 20,
          public: true,
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          manufacturerId: 1,
          manufacturer: {id: 1, name: 'Make Noise'},
          standard: {id: 0, name: '3U Doepfer'},
          tags: [],
          panels: []
        }
      ];
      const mock: SupabaseQueryChain<MinimalModule> = chainable<MinimalModule>(
        {data: mockData, error: null} satisfies QueryListRowsResult<MinimalModule>
      );
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      const inSpy = spyOn(mock, 'in').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.publicModulesByIds([5, 5, 8]).subscribe({
        next: (result) => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('panels:module_panels'));
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('tags:module_tags'));
          expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
          expect(inSpy).toHaveBeenCalledWith('id', [5, 8]);
          expect(result).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('does not query Supabase for an empty id list', (done) => {
      const fromSpy = spyOn(supabaseClient, 'from');

      service.GET.publicModulesByIds([]).subscribe({
        next: (result) => {
          expect(fromSpy).not.toHaveBeenCalled();
          expect(result).toEqual([]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('get.publicRacksByIds', () => {
    it('falls back by default and throws in strict mode when Supabase returns an error response for public racks by ids', async () => {
      const transientError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      };
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: transientError}));

      await expectAsync(firstValueFrom(service.get.publicRacksByIds([7101]))).toBeResolvedTo([]);
      await expectAsync(firstValueFrom(service.get.publicRacksByIds([7101], true))).toBeRejectedWith(transientError);
    });

    it('returns an empty array for successful empty public rack responses', async () => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));

      await expectAsync(firstValueFrom(service.get.publicRacksByIds([7102]))).toBeResolvedTo([]);
    });
  });

  describe('GET.publicPatchesByIds', () => {
    it('falls back by default and throws in strict mode when Supabase returns an error response for public patches by ids', async () => {
      const transientError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      };
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: transientError}));

      await expectAsync(firstValueFrom(service.GET.publicPatchesByIds([7201]))).toBeResolvedTo([]);
      await expectAsync(firstValueFrom(service.GET.publicPatchesByIds([7201], true))).toBeRejectedWith(transientError);
    });

    it('returns an empty array for successful empty public patch responses', async () => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));

      await expectAsync(firstValueFrom(service.GET.publicPatchesByIds([7202]))).toBeResolvedTo([]);
    });
  });

  describe('get.patchWithId', () => {
    it('should resolve with patch data', (done) => {
      const mockData = {id: 10, name: 'My Patch', linked_rack_id: null, author: {id: 'u1'}} satisfies PatchDetailRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<PatchDetailRow>({data: mockData, error: null} satisfies QuerySingleRowResult<PatchDetailRow>)
      );

      service.get.patchWithId(10).subscribe({
        next: (result: QuerySingleRowResult<PatchDetailRow>) => {
          expect(result.data.id).toBe(10);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should preserve linked_rack_id in patch detail responses', (done) => {
      const mockData = {id: 10, name: 'My Patch', linked_rack_id: 33, author: {id: 'u1'}} satisfies PatchDetailRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<PatchDetailRow>({data: mockData, error: null} satisfies QuerySingleRowResult<PatchDetailRow>)
      );

      service.get.patchWithId(10).subscribe({
        next: (result: QuerySingleRowResult<PatchDetailRow>) => {
          expect(result.data.linked_rack_id).toBe(33);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should accept a custom columns argument', (done) => {
      const mock: SupabaseQueryChain<PatchDetailRow> = chainable<PatchDetailRow>({
        data: {id: 10, name: 'My Patch', linked_rack_id: null, author: {id: 'u1'}},
        error: null
      } satisfies QuerySingleRowResult<PatchDetailRow>);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.patchWithId(10, 'id,name').subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('id,name'));
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('get.rackedModules', () => {
    it('should map raw rows to rackingData + module shape', (done) => {
      const rawRow = {
        id: 1,
        row: 0,
        column: 2,
        moduleid: 42,
        rackid: 7,
        module: {
          id: 42,
          name: 'VCO',
          tags: [
            {
              id: 8,
              tag: {id: 3, name: 'VCO', type: TagType.Source},
              voteCount: [{moduletagid: 8}]
            }
          ]
        }
      } satisfies RackModuleRawRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<RackModuleRawRow>({data: [rawRow], error: null} satisfies QueryListRowsResult<RackModuleRawRow>)
      );

      service.get.rackedModules(7).subscribe({
        next: (result: RackedModule[]) => {
          expect(result.length).toBe(1);
          expect(result[0].module.id).toBe(42);
          expect(result[0].module.tags?.[0]?.tag?.name).toBe('VCO');
          expect(result[0].rackingData.rackid).toBe(7);
          expect(result[0].rackingData.row).toBe(0);
          expect(result[0].rackingData.column).toBe(2);
          expect(result[0].rackingData.orientation).toBe('normal');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('requests and maps rack module orientation', (done) => {
      const mock: SupabaseQueryChain<RackModuleRawRow> = chainable<RackModuleRawRow>({
        data: [{
          id: 1,
          row: 0,
          column: 0,
          moduleid: 10,
          rackid: 3,
          selected_panel_id: null,
          orientation: 'rot180',
          module: {id: 10}
        }],
        error: null
      } satisfies QueryListRowsResult<RackModuleRawRow>);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.rackedModules(3).subscribe({
        next: (result: RackedModule[]) => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('orientation'));
          expect(result[0].rackingData.orientation).toBe('rot180');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('requests module tags in the rack-module join', (done) => {
      const mock: SupabaseQueryChain<RackModuleRawRow> = chainable<RackModuleRawRow>(
        {data: [], error: null} satisfies QueryListRowsResult<RackModuleRawRow>
      );
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.rackedModules(7).subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('tags:module_tags'));
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('requests module ins and outs in the rack-module join', (done) => {
      const mock: SupabaseQueryChain<RackModuleRawRow> = chainable<RackModuleRawRow>(
        {data: [], error: null} satisfies QueryListRowsResult<RackModuleRawRow>
      );
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.rackedModules(7).subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('ins:module_ins'));
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('outs:module_outs'));
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should map selected_panel_id from raw row to selectedPanelId', (done) => {
      const rawRow = {
        id: 1,
        row: 0,
        column: 0,
        moduleid: 10,
        rackid: 3,
        selected_panel_id: 5,
        module: {id: 10}
      } satisfies RackModuleRawRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<RackModuleRawRow>({data: [rawRow], error: null} satisfies QueryListRowsResult<RackModuleRawRow>)
      );

      service.get.rackedModules(3).subscribe({
        next: (result: RackedModule[]) => {
          expect(result[0].rackingData.selectedPanelId).toBe(5);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should map null selected_panel_id to selectedPanelId null', (done) => {
      const rawRow = {
        id: 2,
        row: 0,
        column: 0,
        moduleid: 10,
        rackid: 3,
        selected_panel_id: null,
        module: {id: 10}
      } satisfies RackModuleRawRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<RackModuleRawRow>({data: [rawRow], error: null} satisfies QueryListRowsResult<RackModuleRawRow>)
      );

      service.get.rackedModules(3).subscribe({
        next: (result: RackedModule[]) => {
          expect(result[0].rackingData.selectedPanelId).toBeNull();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should return an empty array when rack has no modules', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<RackModuleRawRow>({data: [], error: null} satisfies QueryListRowsResult<RackModuleRawRow>)
      );

      service.get.rackedModules(99).subscribe({
        next: (result: RackedModule[]) => {
          expect(result.length).toBe(0);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('get.publicProfileByUsername', () => {
    it('should resolve with public profile data for a username', (done) => {
      const mockData = {
        id: 'user-42',
        username: 'patcher_fan',
        public: true,
        website: 'https://example.com',
        avatar_url: null,
      } satisfies ProfileByUsernameRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<ProfileByUsernameRow>(
          {data: mockData, error: null} satisfies QuerySingleRowResult<ProfileByUsernameRow>
        )
      );

      service.get.publicProfileByUsername('patcher_fan').subscribe({
        next: (result: QuerySingleRowResult<ProfileByUsernameRow>) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});
