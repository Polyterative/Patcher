import { of } from 'rxjs';
import { CommentContextComponent } from './comment-context.component';
import { DbComment } from 'src/app/models/comment';
import { CommentableEntityTypes } from 'src/app/components/shared-atoms/comments/comments-data.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeComment(entityType: number, entityId = 42): DbComment {
  return {
    id: 1,
    content: 'hello',
    entityId,
    entityType,
    profile: { id: 'u1', username: 'tester' } as any,
    created: '',
    updated: '',
  };
}

function makeBackend(options: {rackPublicId?: string; patchPublicId?: string} = {}) {
  return {
    GET: {
      moduleWithId: jasmine.createSpy('moduleWithId').and.returnValue(
        of({ data: { id: 1, name: 'Test Module', manufacturer: { name: 'Test MFR' } } })
      ),
      rackWithId: jasmine.createSpy('rackWithId').and.returnValue(
        of({ data: { id: 2, name: 'Test Rack', ...(options.rackPublicId ? {public_id: options.rackPublicId} : {}) } })
      ),
    },
    get: {
      patchWithId: jasmine.createSpy('patchWithId').and.returnValue(
        of({ data: { id: 3, name: 'Test Patch', ...(options.patchPublicId ? {public_id: options.patchPublicId} : {}) } })
      ),
    },
  };
}

function makeRouter() {
  return { navigate: jasmine.createSpy('navigate') };
}

function makeComponent(data: DbComment, backendOptions: {rackPublicId?: string; patchPublicId?: string} = {}) {
  const backend = makeBackend(backendOptions);
  const router = makeRouter();
  const comp = new CommentContextComponent(backend as any, router as any);
  comp.data = data;
  return { comp, backend, router };
}

function snapshotContext(comp: CommentContextComponent) {
  let result: any;
  comp.contextInformation$.subscribe(v => (result = v)).unsubscribe();
  return result;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CommentContextComponent', () => {

  describe('initial state', () => {
    it('contextInformation$ starts as undefined', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      expect(snapshotContext(comp)).toBeUndefined();
    });
  });

  describe('ngOnInit() — MODULE entity', () => {
    it('calls backend.GET.moduleWithId with the entityId', () => {
      const { comp, backend } = makeComponent(makeComment(CommentableEntityTypes.MODULE, 55));
      comp.ngOnInit();
      expect(backend.GET.moduleWithId).toHaveBeenCalledWith(55, jasmine.any(String));
    });

    it('populates contextInformation$ with module description', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      const ctx = snapshotContext(comp);
      expect(ctx.description).toBe('Test Module by Test MFR');
    });

    it('sets the correct navigation URL for a module', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      expect(snapshotContext(comp).URL).toEqual(['modules', 'details', 1]);
    });

    it('sets entityLabel to "Module"', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      expect(snapshotContext(comp).entityLabel).toBe('Module');
    });

    it('does not call patch or rack backend methods', () => {
      const { comp, backend } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      expect(backend.get.patchWithId).not.toHaveBeenCalled();
      expect(backend.GET.rackWithId).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit() — PATCH entity', () => {
    it('calls backend.get.patchWithId with the entityId', () => {
      const { comp, backend } = makeComponent(makeComment(CommentableEntityTypes.PATCH, 99));
      comp.ngOnInit();
      expect(backend.get.patchWithId).toHaveBeenCalledWith(99, jasmine.any(String));
    });

    it('populates contextInformation$ with patch name as description', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH));
      comp.ngOnInit();
      expect(snapshotContext(comp).description).toBe('Test Patch');
    });

    it('sets the correct navigation URL for a patch', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH));
      comp.ngOnInit();
      expect(snapshotContext(comp).URL).toEqual(['patches', 'details', 3]);
    });

    it('sets entityLabel to "Patch"', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH));
      comp.ngOnInit();
      expect(snapshotContext(comp).entityLabel).toBe('Patch');
    });

    it('uses the canonical public patch URL when public_id is available', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH), {patchPublicId: 'tokenAbcDef00'});
      comp.ngOnInit();
      expect(snapshotContext(comp).URL).toEqual(['patches', 'tokenAbcDef00']);
    });
  });

  describe('ngOnInit() — RACK entity', () => {
    it('calls backend.GET.rackWithId with the entityId', () => {
      const { comp, backend } = makeComponent(makeComment(CommentableEntityTypes.RACK, 77));
      comp.ngOnInit();
      expect(backend.GET.rackWithId).toHaveBeenCalledWith(77, jasmine.any(String));
    });

    it('populates contextInformation$ with rack name as description', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      expect(snapshotContext(comp).description).toBe('Test Rack');
    });

    it('sets the correct navigation URL for a rack', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      expect(snapshotContext(comp).URL).toEqual(['racks', 'details', 2]);
    });

    it('sets entityLabel to "Rack"', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      expect(snapshotContext(comp).entityLabel).toBe('Rack');
    });

    it('uses the canonical public rack URL when public_id is available', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK), {rackPublicId: 'tokenAbcDef00'});
      comp.ngOnInit();
      expect(snapshotContext(comp).URL).toEqual(['racks', 'tokenAbcDef00']);
    });
  });

  describe('ngOnInit() — unhandled entity type (default branch)', () => {
    it('does not call any backend method for an unknown entityType', () => {
      const { comp, backend } = makeComponent(makeComment(999));
      comp.ngOnInit();
      expect(backend.GET.moduleWithId).not.toHaveBeenCalled();
      expect(backend.get.patchWithId).not.toHaveBeenCalled();
      expect(backend.GET.rackWithId).not.toHaveBeenCalled();
    });

    it('leaves contextInformation$ undefined for an unknown entityType', () => {
      const { comp } = makeComponent(makeComment(999));
      comp.ngOnInit();
      expect(snapshotContext(comp)).toBeUndefined();
    });

    it('does not call any backend method for PROFILE entityType', () => {
      const { comp, backend } = makeComponent(makeComment(CommentableEntityTypes.PROFILE));
      comp.ngOnInit();
      expect(backend.GET.moduleWithId).not.toHaveBeenCalled();
      expect(backend.get.patchWithId).not.toHaveBeenCalled();
      expect(backend.GET.rackWithId).not.toHaveBeenCalled();
    });
  });

  describe('openURL()', () => {
    it('calls router.navigate with the stored URL', () => {
      const { comp, router } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      comp.openURL();
      expect(router.navigate).toHaveBeenCalledWith(['racks', 'details', 2]);
    });
  });
});
