import { Injectable } from '@angular/core';
import {
  Observable,
  throwError
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

@Injectable()
export class RackModuleAdderDataService extends SubManager {
  constructor(private backend: SupabaseService) {
    super();
  }

  addModuleToRack$(moduleId: number, rackId: string | number): Observable<unknown> {
    const normalizedRackId = this.normalizeRackId(rackId);

    if (normalizedRackId === null) {
      return throwError(() => new Error('A valid rack id is required.'));
    }

    return this.backend.add.rackModule(moduleId, normalizedRackId);
  }

  private normalizeRackId(rackId: string | number): number | null {
    const normalizedRackId = typeof rackId === 'number' ? rackId : Number(rackId);
    return Number.isFinite(normalizedRackId) ? normalizedRackId : null;
  }
}
