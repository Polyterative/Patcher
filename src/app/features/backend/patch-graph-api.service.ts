import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DbModule } from 'src/app/models/module';
import { SupabaseService } from './supabase.service';

interface ModuleWithIdResponse {
  data: DbModule | null;
  error?: unknown;
}

@Injectable({ providedIn: 'root' })
export class PatchGraphApiService {
  constructor(
    private readonly backend: SupabaseService
  ) {}

  moduleWithId(moduleId: number): Observable<DbModule | null> {
    return this.backend.GET.moduleWithId(moduleId).pipe(
      map((response: ModuleWithIdResponse) => {
        if (response.error) {
          throw response.error;
        }

        return response.data;
      })
    );
  }
}
