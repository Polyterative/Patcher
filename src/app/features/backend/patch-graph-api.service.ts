import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PatchGraphModule } from 'src/app/components/patch-parts/patch-graph/patch-graph-build.models';
import { SupabaseService } from './supabase.service';

interface ModulesByIdsForPatchGraphResponse {
  data: PatchGraphModule[] | null;
  error?: unknown;
}

@Injectable({ providedIn: 'root' })
export class PatchGraphApiService {
  constructor(
    private readonly backend: SupabaseService
  ) {}

  modulesByIds(moduleIds: number[]): Observable<PatchGraphModule[]> {
    return this.backend.GET.modulesByIdsForPatchGraph(moduleIds).pipe(
      map((response: ModulesByIdsForPatchGraphResponse) => {
        if (response.error) {
          throw response.error;
        }

        return response.data ?? [];
      })
    );
  }
}

