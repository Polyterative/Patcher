import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PatchGraphApiService } from 'src/app/features/backend/patch-graph-api.service';
import { PatchConnection } from 'src/app/models/connection';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { PatchGraphModule } from './patch-graph-build.models';
import { extractPatchGraphModuleInstances } from './patch-graph-build.utils';

@Injectable()
export class PatchGraphDataService extends SubManager {
  constructor(
    private readonly patchGraphApi: PatchGraphApiService
  ) {
    super();
  }

  modulesForConnections(connections: PatchConnection[]): Observable<PatchGraphModule[]> {
    const uniqueModuleIds = [...new Set(
      extractPatchGraphModuleInstances(connections).map(instance => instance.moduleId)
    )];

    return this.patchGraphApi.modulesByIds(uniqueModuleIds);
  }
}
