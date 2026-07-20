import { of } from 'rxjs';
import { CommentableEntityTypes } from 'src/app/models/comment';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbComment } from 'src/app/models/comment';
import {
  CommentContext,
  CommentContextDataService
} from './comment-context-data.service';

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

function makeBackend() {
  const moduleCommentContext = jasmine.createSpy('moduleCommentContext').and.returnValue(
    of({ data: { id: 1, name: 'Test Module', manufacturer: { name: 'Test MFR' } } })
  );
  const patchCommentContext = jasmine.createSpy('patchCommentContext').and.returnValue(
    of({ data: { id: 3, name: 'Test Patch', public_id: null } })
  );
  const rackCommentContext = jasmine.createSpy('rackCommentContext').and.returnValue(
    of({ data: { id: 2, name: 'Test Rack', public_id: null } })
  );

  return {
    backend: {
      GET: {
        moduleCommentContext,
        patchCommentContext,
        rackCommentContext,
      }
    } as unknown as SupabaseService,
    spies: {
      moduleCommentContext,
      patchCommentContext,
      rackCommentContext,
    }
  };
}

function readContext(service: CommentContextDataService, comment: DbComment): CommentContext | undefined {
  let result: CommentContext | undefined;
  service.contextForComment(comment).subscribe(value => (result = value)).unsubscribe();
  return result;
}

describe('CommentContextDataService', () => {
  it('loads module context through the backend helper', () => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    const context = readContext(service, makeComment(CommentableEntityTypes.MODULE, 55));

    expect(spies.moduleCommentContext).toHaveBeenCalledWith(55);
    expect(context).toEqual({
      description: 'Test Module by Test MFR',
      URL: ['modules', 'details', 1],
      entityLabel: 'Module',
    });
  });

  it('loads patch context and prefers the public URL when available', () => {
    const { backend, spies } = makeBackend();
    spies.patchCommentContext.and.returnValue(
      of({ data: { id: 3, name: 'Test Patch', public_id: 'tokenAbcDef00' } })
    );
    const service = new CommentContextDataService(backend);

    const context = readContext(service, makeComment(CommentableEntityTypes.PATCH, 99));

    expect(spies.patchCommentContext).toHaveBeenCalledWith(99);
    expect(context).toEqual({
      description: 'Test Patch',
      URL: ['patches', 'tokenAbcDef00'],
      entityLabel: 'Patch',
    });
  });

  it('loads rack context and falls back to the detail URL without a public id', () => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    const context = readContext(service, makeComment(CommentableEntityTypes.RACK, 77));

    expect(spies.rackCommentContext).toHaveBeenCalledWith(77);
    expect(context).toEqual({
      description: 'Test Rack',
      URL: ['racks', 'details', 2],
      entityLabel: 'Rack',
    });
  });

  it('does not call backend helpers for profile comments', () => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    let emitted = false;
    service.contextForComment(makeComment(CommentableEntityTypes.PROFILE))
      .subscribe(() => (emitted = true))
      .unsubscribe();

    expect(emitted).toBeFalse();
    expect(spies.moduleCommentContext).not.toHaveBeenCalled();
    expect(spies.patchCommentContext).not.toHaveBeenCalled();
    expect(spies.rackCommentContext).not.toHaveBeenCalled();
  });

  it('surfaces missing backend rows as errors', () => {
    const { backend, spies } = makeBackend();
    const error = new Error('missing patch');
    spies.patchCommentContext.and.returnValue(of({ data: null, error }));
    const service = new CommentContextDataService(backend);
    let capturedError: unknown;

    service.contextForComment(makeComment(CommentableEntityTypes.PATCH))
      .subscribe({ error: thrown => (capturedError = thrown) })
      .unsubscribe();

    expect(capturedError).toBe(error);
  });
});
