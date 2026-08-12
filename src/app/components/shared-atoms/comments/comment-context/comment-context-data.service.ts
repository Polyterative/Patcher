import { Injectable } from '@angular/core';
import { EMPTY, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  CommentableEntityTypes,
  DbComment
} from 'src/app/models/comment';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export interface CommentContext {
  description: string;
  URL: (string | number)[];
  entityLabel: string;
}

const ENTITY_LABELS: Record<number, string> = {
  [CommentableEntityTypes.MODULE]: 'Module',
  [CommentableEntityTypes.RACK]:   'Rack',
  [CommentableEntityTypes.PATCH]:  'Patch',
  [CommentableEntityTypes.PROFILE]: 'Profile',
};

interface IdentifiedRow {
  id: number;
}

/**
 * Coalesces concurrent per-entity-type context lookups issued within the same
 * synchronous rendering pass (e.g. a comments page mounting one
 * `<app-comment-context>` per row) into a single batched backend call instead
 * of one request per row. Each `.load(id)` call still resolves independently
 * with its own row (or errors if the row is missing from the batch), so
 * callers don't need to know batching is happening.
 *
 * Each requested id gets its own dedicated Subject, held in a map that is
 * atomically swapped out right before the batch fetch fires. This means a
 * caller's result always comes from the exact fetch that included its own id
 * — unlike multicasting a shared stream and racing a bare `take(1)` against
 * it, which can resolve a caller against an unrelated, already-in-flight
 * batch when a new request arrives while a previous one hasn't returned yet.
 */
class ContextBatchLoader<T extends IdentifiedRow> {
  private pending = new Map<number, Subject<T>>();
  private flushScheduled = false;

  constructor(
    private readonly fetchBatch: (ids: number[]) => Observable<T[]>,
    private readonly notFoundMessage: (id: number) => string
  ) {
  }

  load(id: number): Observable<T> {
    let subject = this.pending.get(id);
    if (!subject) {
      subject = new Subject<T>();
      this.pending.set(id, subject);
      this.scheduleFlush();
    }
    return subject.asObservable();
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) {
      return;
    }
    this.flushScheduled = true;
    // Flushing on a macrotask boundary lets every `.load()` call issued during
    // the current synchronous rendering pass (e.g. N sibling rows mounting in
    // one change-detection cycle) join this same batch before it fires.
    setTimeout(() => this.flush(), 0);
  }

  private flush(): void {
    this.flushScheduled = false;
    const toResolve = this.pending;
    this.pending = new Map();

    this.fetchBatch(Array.from(toResolve.keys())).subscribe({
      next: rows => {
        const rowsById = new Map(rows.map(row => [row.id, row]));
        toResolve.forEach((subject, id) => {
          const row = rowsById.get(id);
          if (row) {
            subject.next(row);
            subject.complete();
          } else {
            subject.error(new Error(this.notFoundMessage(id)));
          }
        });
      },
      error: err => toResolve.forEach(subject => subject.error(err))
    });
  }
}

@Injectable({ providedIn: 'root' })
export class CommentContextDataService extends SubManager {
  private readonly moduleLoader = new ContextBatchLoader(
    (ids: number[]) => this.backend.GET.moduleCommentContexts(ids),
    id => `Comment context module ${ id } was not found.`
  );
  private readonly patchLoader = new ContextBatchLoader(
    (ids: number[]) => this.backend.GET.patchCommentContexts(ids),
    id => `Comment context patch ${ id } was not found.`
  );
  private readonly rackLoader = new ContextBatchLoader(
    (ids: number[]) => this.backend.GET.rackCommentContexts(ids),
    id => `Comment context rack ${ id } was not found.`
  );

  constructor(
    private backend: SupabaseService,
  ) {
    super();
  }

  contextForComment(comment: DbComment): Observable<CommentContext> {
    const entityLabel = ENTITY_LABELS[comment.entityType] ?? 'Item';

    switch (comment.entityType) {
      case CommentableEntityTypes.MODULE:
        return this.moduleLoader.load(comment.entityId).pipe(
          map(module => ({
            description: `${ module.name } by ${ module.manufacturer.name }`,
            URL: ['modules', 'details', module.id],
            entityLabel,
          }))
        );
      case CommentableEntityTypes.PATCH:
        return this.patchLoader.load(comment.entityId).pipe(
          map(patch => ({
            description: patch.name,
            URL: patch.public_id
              ? ['patches', patch.public_id]
              : ['patches', 'details', patch.id],
            entityLabel,
          }))
        );
      case CommentableEntityTypes.RACK:
        return this.rackLoader.load(comment.entityId).pipe(
          map(rack => ({
            description: rack.name,
            URL: rack.public_id
              ? ['racks', rack.public_id]
              : ['racks', 'details', rack.id],
            entityLabel,
          }))
        );
      default:
        return EMPTY;
    }
  }
}

