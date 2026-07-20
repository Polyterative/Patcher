import { Router } from '@angular/router';
import { of } from 'rxjs';
import { CommentableEntityTypes } from 'src/app/models/comment';
import { DbComment } from 'src/app/models/comment';
import {
  CommentContext,
  CommentContextDataService
} from 'src/app/components/shared-atoms/comments/comment-context/comment-context-data.service';
import { CommentContextComponent } from './comment-context.component';

function makeComment(entityType: number, entityId = 42): DbComment {
  return {
    id: 1,
    content: 'hello',
    entityId,
    entityType,
    profile: { id: 'u1', username: 'tester' },
    created: '',
    updated: '',
  };
}

function makeContext(
  entityType: number,
  options: { rackPublicId?: string; patchPublicId?: string } = {}
): CommentContext {
  switch (entityType) {
    case CommentableEntityTypes.MODULE:
      return {
        description: 'Test Module by Test MFR',
        URL: ['modules', 'details', 1],
        entityLabel: 'Module',
      };
    case CommentableEntityTypes.PATCH:
      return {
        description: 'Test Patch',
        URL: options.patchPublicId
          ? ['patches', options.patchPublicId]
          : ['patches', 'details', 3],
        entityLabel: 'Patch',
      };
    case CommentableEntityTypes.RACK:
      return {
        description: 'Test Rack',
        URL: options.rackPublicId
          ? ['racks', options.rackPublicId]
          : ['racks', 'details', 2],
        entityLabel: 'Rack',
      };
    default:
      return {
        description: '',
        URL: [],
        entityLabel: 'Item',
      };
  }
}

function makeComponent(
  data: DbComment,
  contextOptions: { rackPublicId?: string; patchPublicId?: string } = {}
) {
  const dataService = jasmine.createSpyObj<CommentContextDataService>('CommentContextDataService', ['contextForComment']);
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const hasContext = [
    CommentableEntityTypes.MODULE,
    CommentableEntityTypes.PATCH,
    CommentableEntityTypes.RACK
  ].includes(data.entityType);

  dataService.contextForComment.and.returnValue(
    hasContext ? of(makeContext(data.entityType, contextOptions)) : of()
  );

  const comp = new CommentContextComponent(dataService, router);
  comp.data = data;
  return { comp, dataService, router };
}

function snapshotContext(comp: CommentContextComponent): CommentContext | undefined {
  let result: CommentContext | undefined;
  comp.contextInformation$.subscribe(value => (result = value)).unsubscribe();
  return result;
}

describe('CommentContextComponent', () => {
  describe('initial state', () => {
    it('contextInformation$ starts as undefined', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      expect(snapshotContext(comp)).toBeUndefined();
    });
  });

  describe('ngOnInit() — MODULE entity', () => {
    it('requests context for the module comment', () => {
      const comment = makeComment(CommentableEntityTypes.MODULE, 55);
      const { comp, dataService } = makeComponent(comment);
      comp.ngOnInit();
      expect(dataService.contextForComment).toHaveBeenCalledWith(comment);
    });

    it('populates contextInformation$ with module description', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.description).toBe('Test Module by Test MFR');
    });

    it('sets the correct navigation URL for a module', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.URL).toEqual(['modules', 'details', 1]);
    });

    it('sets entityLabel to "Module"', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.MODULE));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.entityLabel).toBe('Module');
    });
  });

  describe('ngOnInit() — PATCH entity', () => {
    it('requests context for the patch comment', () => {
      const comment = makeComment(CommentableEntityTypes.PATCH, 99);
      const { comp, dataService } = makeComponent(comment);
      comp.ngOnInit();
      expect(dataService.contextForComment).toHaveBeenCalledWith(comment);
    });

    it('populates contextInformation$ with patch name as description', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.description).toBe('Test Patch');
    });

    it('sets the correct navigation URL for a patch', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.URL).toEqual(['patches', 'details', 3]);
    });

    it('sets entityLabel to "Patch"', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.entityLabel).toBe('Patch');
    });

    it('uses the canonical public patch URL when public_id is available', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.PATCH), { patchPublicId: 'tokenAbcDef00' });
      comp.ngOnInit();
      expect(snapshotContext(comp)?.URL).toEqual(['patches', 'tokenAbcDef00']);
    });
  });

  describe('ngOnInit() — RACK entity', () => {
    it('requests context for the rack comment', () => {
      const comment = makeComment(CommentableEntityTypes.RACK, 77);
      const { comp, dataService } = makeComponent(comment);
      comp.ngOnInit();
      expect(dataService.contextForComment).toHaveBeenCalledWith(comment);
    });

    it('populates contextInformation$ with rack name as description', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.description).toBe('Test Rack');
    });

    it('sets the correct navigation URL for a rack', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.URL).toEqual(['racks', 'details', 2]);
    });

    it('sets entityLabel to "Rack"', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK));
      comp.ngOnInit();
      expect(snapshotContext(comp)?.entityLabel).toBe('Rack');
    });

    it('uses the canonical public rack URL when public_id is available', () => {
      const { comp } = makeComponent(makeComment(CommentableEntityTypes.RACK), { rackPublicId: 'tokenAbcDef00' });
      comp.ngOnInit();
      expect(snapshotContext(comp)?.URL).toEqual(['racks', 'tokenAbcDef00']);
    });
  });

  describe('ngOnInit() — unhandled entity type (default branch)', () => {
    it('leaves contextInformation$ undefined for an unknown entityType', () => {
      const { comp, dataService } = makeComponent(makeComment(999));
      comp.ngOnInit();
      expect(dataService.contextForComment).toHaveBeenCalledTimes(1);
      expect(snapshotContext(comp)).toBeUndefined();
    });

    it('leaves contextInformation$ undefined for PROFILE entityType', () => {
      const { comp, dataService } = makeComponent(makeComment(CommentableEntityTypes.PROFILE));
      comp.ngOnInit();
      expect(dataService.contextForComment).toHaveBeenCalledTimes(1);
      expect(snapshotContext(comp)).toBeUndefined();
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
