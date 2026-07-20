import { Injectable } from '@angular/core';
import { getModulePanelPublicUrl } from 'src/app/features/backend/supabase-storage';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

@Injectable()
export class ModulePartImageDataService extends SubManager {
  getPanelImageUrl(filename: string, useDirectStorageFallback = false): string | undefined {
    return getModulePanelPublicUrl(filename, useDirectStorageFallback);
  }
}
