import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
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

interface CommentContextResponse<T> {
  data: T | null;
  error?: unknown;
}

@Injectable()
export class CommentContextDataService extends SubManager {
  constructor(
    private backend: SupabaseService,
  ) {
    super();
  }

  contextForComment(comment: DbComment): Observable<CommentContext> {
    const entityLabel = ENTITY_LABELS[comment.entityType] ?? 'Item';

    switch (comment.entityType) {
      case CommentableEntityTypes.MODULE:
        return this.backend.GET.moduleCommentContext(comment.entityId).pipe(
          map(response => this.requireData(response, entityLabel)),
          map(module => ({
            description: `${ module.name } by ${ module.manufacturer.name }`,
            URL: ['modules', 'details', module.id],
            entityLabel,
          }))
        );
      case CommentableEntityTypes.PATCH:
        return this.backend.GET.patchCommentContext(comment.entityId).pipe(
          map(response => this.requireData(response, entityLabel)),
          map(patch => ({
            description: patch.name,
            URL: patch.public_id
              ? ['patches', patch.public_id]
              : ['patches', 'details', patch.id],
            entityLabel,
          }))
        );
      case CommentableEntityTypes.RACK:
        return this.backend.GET.rackCommentContext(comment.entityId).pipe(
          map(response => this.requireData(response, entityLabel)),
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

  private requireData<T>(
    response: CommentContextResponse<T>,
    entityLabel: string
  ): T {
    if (!response.data) {
      throw response.error ?? new Error(`Comment context ${ entityLabel.toLowerCase() } was not found.`);
    }

    return response.data;
  }
}
