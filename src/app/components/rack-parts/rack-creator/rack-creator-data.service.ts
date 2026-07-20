import { Injectable } from '@angular/core';
import {
  forkJoin,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  catchError,
  map,
  switchMap
} from 'rxjs/operators';
import { MinimalModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SimpleUserModel } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  ModularGridRackModulePlacement,
  ModularGridSourceModule
} from './modulargrid-import/modulargrid-import.types';
import { buildModularGridCandidateSearchTerms } from './modulargrid-import/modulargrid-matcher';

export interface RackCreatorPlacementSummary {
  placed: number;
  failed: number;
}

export interface RackCreatorCreateResult {
  rackId: number | null;
  placementSummary: RackCreatorPlacementSummary;
}

type RackCreatorRackDraft = Omit<RackMinimal, 'author' | 'created' | 'updated' | 'id'>;
@Injectable()
export class RackCreatorDataService extends SubManager {
  constructor(private backend: SupabaseService) {
    super();
  }

  getUserSession$(): Observable<SimpleUserModel | null> {
    return this.backend.auth.getUserSession$();
  }

  loadModuleCatalogue$(
    fallbackModules: MinimalModule[],
    sourceModules: ModularGridSourceModule[] = []
  ): Observable<MinimalModule[]> {
    const searchTerms = buildModularGridCandidateSearchTerms(sourceModules);

    if (searchTerms.length === 0) {
      return of(this.mergeUniqueModules(fallbackModules, []));
    }

    return this.backend.GET.publicModuleImportCandidates(searchTerms).pipe(
      map(modules => this.mergeUniqueModules(fallbackModules, modules))
    );
  }

  createRack$(rackDraft: RackCreatorRackDraft): Observable<RackCreatorCreateResult> {
    return this.backend.add.rack(rackDraft).pipe(
      map(response => ({
        rackId: this.extractRackId(response),
        placementSummary: {
          placed: 0,
          failed: 0
        }
      }))
    );
  }

  createRackWithPlacements$(
    rackDraft: RackCreatorRackDraft,
    placements: ModularGridRackModulePlacement[]
  ): Observable<RackCreatorCreateResult> {
    return this.backend.add.rack(rackDraft).pipe(
      switchMap(response => {
        const rackId = this.extractRackId(response);
        if (!rackId || placements.length === 0) {
          return of({
            rackId,
            placementSummary: {
              placed: 0,
              failed: 0
            }
          });
        }

        return this.placeRackModules$(rackId, placements).pipe(
          switchMap(placementSummary => placementSummary.failed > 0
            ? this.rollbackFailedImport$(rackId, placementSummary)
            : of({
              rackId,
              placementSummary
            })
          )
        );
      })
    );
  }

  private placeRackModules$(
    rackId: number,
    placements: ModularGridRackModulePlacement[]
  ): Observable<RackCreatorPlacementSummary> {
    if (placements.length === 0) {
      return of({
        placed: 0,
        failed: 0
      });
    }

    return forkJoin(placements.map(placement => this.backend.add.rackModule(
      placement.moduleId,
      rackId,
      placement.row,
      placement.column
    ).pipe(
      map(() => true),
      catchError(() => of(false))
    ))).pipe(
      map(results => ({
        placed: results.filter(Boolean).length,
        failed: results.filter(result => !result).length
      }))
    );
  }

  private rollbackFailedImport$(
    rackId: number,
    placementSummary: RackCreatorPlacementSummary
  ): Observable<RackCreatorCreateResult> {
    return this.backend.delete.modulesOfRack(rackId).pipe(
      switchMap(() => this.backend.delete.userRack(rackId)),
      switchMap(() => throwError(() => new Error(
        `Rack import rolled back after ${ placementSummary.failed } placement failure(s).`
      )))
    );
  }

  private extractRackId(response: unknown): number | null {
    const responseObject = response as {
      id?: number;
      data?: {id?: number}[] | {id?: number} | null;
    };

    if (typeof responseObject?.id === 'number') {
      return responseObject.id;
    }

    if (Array.isArray(responseObject?.data) && typeof responseObject.data[0]?.id === 'number') {
      return responseObject.data[0].id;
    }

    if (!Array.isArray(responseObject?.data) && typeof responseObject?.data?.id === 'number') {
      return responseObject.data.id;
    }

    return null;
  }

  private mergeUniqueModules(
    fallbackModules: MinimalModule[],
    catalogueModules: MinimalModule[]
  ): MinimalModule[] {
    const modulesById = new Map<number, MinimalModule>();
    [...fallbackModules, ...catalogueModules]
      .filter(module => !!module && Number.isFinite(module.id))
      .forEach(module => modulesById.set(module.id, module));

    return [...modulesById.values()];
  }
}
