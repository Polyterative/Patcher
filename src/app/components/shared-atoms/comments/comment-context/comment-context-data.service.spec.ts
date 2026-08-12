import { fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CommentableEntityTypes } from 'src/app/models/comment';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbComment } from 'src/app/models/comment';
import {
  CommentContext,
  CommentContextDataService
} from './comment-context-data.service';

function makeComment(entityType: number, entityId = 42, id = 1): DbComment {
  return {
    id,
    content: 'hello',
    entityId,
    entityType,
    profile: { id: 'u1', username: 'tester' },
    created: '',
    updated: '',
  };
}

function makeBackend() {
  const moduleCommentContexts = jasmine.createSpy('moduleCommentContexts').and.returnValue(
    of([{ id: 1, name: 'Test Module', manufacturer: { name: 'Test MFR' } }])
  );
  const patchCommentContexts = jasmine.createSpy('patchCommentContexts').and.returnValue(
    of([{ id: 3, name: 'Test Patch', public_id: null }])
  );
  const rackCommentContexts = jasmine.createSpy('rackCommentContexts').and.returnValue(
    of([{ id: 2, name: 'Test Rack', public_id: null }])
  );

  return {
    backend: {
      GET: {
        moduleCommentContexts,
        patchCommentContexts,
        rackCommentContexts,
      }
    } as unknown as SupabaseService,
    spies: {
      moduleCommentContexts,
      patchCommentContexts,
      rackCommentContexts,
    }
  };
}

function readContext(service: CommentContextDataService, comment: DbComment): {
  result?: CommentContext;
  error?: unknown;
} {
  const snapshot: { result?: CommentContext; error?: unknown } = {};
  service.contextForComment(comment).subscribe({
    next: value => (snapshot.result = value),
    error: err => (snapshot.error = err),
  });
  tick();
  return snapshot;
}

describe('CommentContextDataService', () => {
  it('loads module context through the batched backend helper', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    const { result } = readContext(service, makeComment(CommentableEntityTypes.MODULE, 1));

    expect(spies.moduleCommentContexts).toHaveBeenCalledWith([1]);
    expect(result).toEqual({
      description: 'Test Module by Test MFR',
      URL: ['modules', 'details', 1],
      entityLabel: 'Module',
    });
  }));

  it('loads patch context and prefers the public URL when available', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    spies.patchCommentContexts.and.returnValue(
      of([{ id: 3, name: 'Test Patch', public_id: 'tokenAbcDef00' }])
    );
    const service = new CommentContextDataService(backend);

    const { result } = readContext(service, makeComment(CommentableEntityTypes.PATCH, 3));

    expect(spies.patchCommentContexts).toHaveBeenCalledWith([3]);
    expect(result).toEqual({
      description: 'Test Patch',
      URL: ['patches', 'tokenAbcDef00'],
      entityLabel: 'Patch',
    });
  }));

  it('loads rack context and falls back to the detail URL without a public id', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    const { result } = readContext(service, makeComment(CommentableEntityTypes.RACK, 2));

    expect(spies.rackCommentContexts).toHaveBeenCalledWith([2]);
    expect(result).toEqual({
      description: 'Test Rack',
      URL: ['racks', 'details', 2],
      entityLabel: 'Rack',
    });
  }));

  it('does not call backend helpers for profile comments', () => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    let emitted = false;
    service.contextForComment(makeComment(CommentableEntityTypes.PROFILE))
      .subscribe(() => (emitted = true))
      .unsubscribe();

    expect(emitted).toBeFalse();
    expect(spies.moduleCommentContexts).not.toHaveBeenCalled();
    expect(spies.patchCommentContexts).not.toHaveBeenCalled();
    expect(spies.rackCommentContexts).not.toHaveBeenCalled();
  });

  it('surfaces a missing row (absent from the batch result) as an error', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    spies.patchCommentContexts.and.returnValue(of([]));
    const service = new CommentContextDataService(backend);

    const { error } = readContext(service, makeComment(CommentableEntityTypes.PATCH, 3));

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('was not found');
  }));

  it('batches multiple concurrent module lookups issued in the same tick into one backend call', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    spies.moduleCommentContexts.and.returnValue(of([
      { id: 1, name: 'Module One', manufacturer: { name: 'MFR A' } },
      { id: 5, name: 'Module Five', manufacturer: { name: 'MFR B' } },
      { id: 9, name: 'Module Nine', manufacturer: { name: 'MFR C' } },
    ]));
    const service = new CommentContextDataService(backend);

    const results: (CommentContext | undefined)[] = [undefined, undefined, undefined];
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 1, 100)).subscribe(v => (results[0] = v));
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 5, 101)).subscribe(v => (results[1] = v));
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 9, 102)).subscribe(v => (results[2] = v));
    tick();

    expect(spies.moduleCommentContexts).toHaveBeenCalledTimes(1);
    expect(spies.moduleCommentContexts).toHaveBeenCalledWith([1, 5, 9]);
    expect(results[0]?.description).toBe('Module One by MFR A');
    expect(results[1]?.description).toBe('Module Five by MFR B');
    expect(results[2]?.description).toBe('Module Nine by MFR C');
  }));

  it('batches distinct entity types issued in the same tick into separate calls', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    let moduleResult: CommentContext | undefined;
    let patchResult: CommentContext | undefined;
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 1, 200)).subscribe(v => (moduleResult = v));
    service.contextForComment(makeComment(CommentableEntityTypes.PATCH, 3, 201)).subscribe(v => (patchResult = v));
    tick();

    expect(spies.moduleCommentContexts).toHaveBeenCalledTimes(1);
    expect(spies.patchCommentContexts).toHaveBeenCalledTimes(1);
    expect(moduleResult?.entityLabel).toBe('Module');
    expect(patchResult?.entityLabel).toBe('Patch');
  }));

  it('deduplicates repeated ids within the same batch into a single fetched id', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    const service = new CommentContextDataService(backend);

    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 1, 300)).subscribe();
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 1, 301)).subscribe();
    tick();

    expect(spies.moduleCommentContexts).toHaveBeenCalledWith([1]);
  }));

  it('resolves a later request against its own batch, not an earlier still-pending one', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    const firstBatch = new Subject<{ id: number; name: string; manufacturer: { name: string } }[]>();
    const secondBatch = new Subject<{ id: number; name: string; manufacturer: { name: string } }[]>();
    spies.moduleCommentContexts.and.returnValues(firstBatch, secondBatch);
    const service = new CommentContextDataService(backend);

    let firstResult: CommentContext | undefined;
    let secondResult: CommentContext | undefined;
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 1, 400)).subscribe(v => (firstResult = v));
    tick(); // flush the first batch's macrotask so its backend call fires but stays unresolved

    // A second request for a *different* id arrives while the first backend
    // call is still in flight (firstBatch hasn't emitted yet).
    service.contextForComment(makeComment(CommentableEntityTypes.MODULE, 9, 401)).subscribe(v => (secondResult = v));
    tick(); // flush the second batch's macrotask so its own backend call fires

    expect(spies.moduleCommentContexts).toHaveBeenCalledTimes(2);
    expect(spies.moduleCommentContexts.calls.argsFor(0)).toEqual([[1]]);
    expect(spies.moduleCommentContexts.calls.argsFor(1)).toEqual([[9]]);

    // Resolve the second (later) fetch first, then the first (earlier) one —
    // each caller must still get its own id's row, not whichever arrives first.
    secondBatch.next([{ id: 9, name: 'Module Nine', manufacturer: { name: 'MFR C' } }]);
    secondBatch.complete();
    firstBatch.next([{ id: 1, name: 'Module One', manufacturer: { name: 'MFR A' } }]);
    firstBatch.complete();
    tick();

    expect(firstResult?.description).toBe('Module One by MFR A');
    expect(secondResult?.description).toBe('Module Nine by MFR C');
  }));

  it('propagates a real backend error instead of masking it as a not-found error', fakeAsync(() => {
    const { backend, spies } = makeBackend();
    const backendError = new Error('real backend failure');
    spies.moduleCommentContexts.and.returnValue(throwError(() => backendError));
    const service = new CommentContextDataService(backend);

    const { error } = readContext(service, makeComment(CommentableEntityTypes.MODULE, 1, 500));

    expect(error).toBe(backendError);
  }));
});
