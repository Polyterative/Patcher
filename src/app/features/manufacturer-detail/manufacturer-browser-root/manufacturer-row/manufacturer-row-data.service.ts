import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleRecentMarketPrice } from 'src/app/features/backend/supabase-queries';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Injectable()
export class ManufacturerRowDataService extends SubManager {
  constructor(private readonly backend: SupabaseService) {
    super();
  }

  get logoStorageBase(): string {
    return this.backend.storage.publicUrlBases.manufacturerLogos;
  }

  modulesBySameManufacturer(manufacturerId: number): Observable<ModuleList> {
    return this.backend.get.modulesBySameManufacturer(manufacturerId, 0, 29);
  }

  recentModuleMarketPrices(moduleIds: number[]): Observable<ModuleRecentMarketPrice[]> {
    return this.backend.GET.recentModuleMarketPrices(moduleIds);
  }

  get canLoadRecentModuleMarketPrices(): boolean {
    return !!this.backend.GET?.recentModuleMarketPrices;
  }
}
