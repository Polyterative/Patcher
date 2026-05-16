import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Component({
  selector: 'app-manufacturer-browser-root',
  templateUrl: './manufacturer-browser-root.component.html',
  styleUrls: ['./manufacturer-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerBrowserRootComponent extends SubManager {
  private readonly document = inject(DOCUMENT);
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

  constructor(
    public readonly dataService: ManufacturerBrowserRootDataService,
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
    
    this.dataService.paginatorToFistPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.document.defaultView?.scrollTo({top: 0, behavior: 'smooth'});
      });
    
    this.dataService.updateList$.next();
  }
}