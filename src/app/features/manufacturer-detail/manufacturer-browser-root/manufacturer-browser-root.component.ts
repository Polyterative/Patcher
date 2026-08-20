import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  AppStateService,
  ModuleListDisplayMode
} from 'src/app/shared-interproject/app-state.service';


@Component({
  selector: 'app-manufacturer-browser-root',
  templateUrl: './manufacturer-browser-root.component.html',
  styleUrls: ['./manufacturer-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerBrowserRootComponent extends SubManager {
  readonly formTypes = FormTypes;

  get hasMoreManufacturers(): boolean {
    const total = this.dataService.serversideAdditionalData.itemsCount$.value;
    return this.dataService.loadedCount < total;
  }

  get remainingManufacturersCount(): number {
    const total = this.dataService.serversideAdditionalData.itemsCount$.value;
    return Math.max(0, total - this.dataService.loadedCount);
  }

  loadMore(): void {
    this.dataService.loadMore$.next();
  }

  setDisplayMode(mode: ModuleListDisplayMode): void {
    this.appState.setModuleListDisplayMode(mode);
  }

  constructor(
    public readonly dataService: ManufacturerBrowserRootDataService,
    public readonly appState: AppStateService,
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();

    this.seoAndUtilsService.updateSeo(
      {
        title: 'Manufacturers — Eurorack Module Makers',
        description: 'Browse all Eurorack module manufacturers on patcher.xyz.',
        url: 'https://patcher.xyz/manufacturers/browser'
      },
      'Manufacturers'
    );
    
    this.dataService.updateList$.next();
  }
}