import { Injectable } from '@angular/core';
import {
  PatchCreatorApiService,
  PatchCreatorPatchDraft
} from 'src/app/features/backend/patch-creator-api.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

@Injectable()
export class PatchCreatorDataService extends SubManager {
  constructor(
    private readonly patchCreatorApi: PatchCreatorApiService
  ) {
    super();
  }

  currentUserRacks$(): ReturnType<PatchCreatorApiService['currentUserRacks']> {
    return this.patchCreatorApi.currentUserRacks();
  }

  createPatch$(patchDraft: PatchCreatorPatchDraft): ReturnType<PatchCreatorApiService['createPatch']> {
    return this.patchCreatorApi.createPatch(patchDraft);
  }
}
