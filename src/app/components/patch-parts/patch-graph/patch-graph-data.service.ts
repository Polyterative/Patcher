import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PatchGraphApiService } from 'src/app/features/backend/patch-graph-api.service';
import { PatchConnection } from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { extractPatchGraphModuleInstances } from './patch-graph-build.utils';

@Injectable()
export class PatchGraphDataService extends SubManager {
  constructor(
    private readonly patchGraphApi: PatchGraphApiService
  ) {
    super();
  }

  modulesForConnections(connections: PatchConnection[]): Observable<DbModule[]> {
    const uniqueModuleIds = [...new Set(
      extractPatchGraphModuleInstances(connections).map(instance => instance.moduleId)
    )];

    return forkJoin(
      uniqueModuleIds.map(moduleId => this.patchGraphApi.moduleWithId(moduleId))
    ).pipe(
      map(modules => modules.filter((module): module is DbModule => Boolean(module)))
    );
  }
}
