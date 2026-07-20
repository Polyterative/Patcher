import { Injectable } from '@angular/core';
import { getRackImagePublicUrl } from 'src/app/features/backend/supabase-storage';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

@Injectable()
export class RackImageDataService extends SubManager {
  getRackImageUrl(filename: string, useDirectStorageFallback = false): string | undefined {
    return getRackImagePublicUrl(filename, useDirectStorageFallback);
  }
}
