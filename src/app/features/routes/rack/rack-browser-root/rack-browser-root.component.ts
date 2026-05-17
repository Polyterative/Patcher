import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  skip,
  switchMap,
  take,
  takeUntil
} from 'rxjs/operators';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { RackBrowserDataService } from 'src/app/features/routes/rack/rack-browser-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Component({
  selector: 'app-rack-browser-root',
  templateUrl: './rack-browser-root.component.html',
  styleUrls: ['./rack-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackBrowserRootComponent extends SubManager {
  private readonly document = inject(DOCUMENT);
  
  readonly formTypes = FormTypes;
  readonly viewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};

  constructor(
    public dataService: RackBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    
    this.seoAndUtilsService.updateSeo(
      {description: 'Racks created by patcher.xyz community. Get inspired and explore new possibilities!'},
      'Racks'
    );

    this.dataService.loadMore$
      .pipe(
        switchMap(() => this.dataService.racksList$.pipe(
          skip(1),
          take(1)
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.document.defaultView?.scrollTo({top: 0, behavior: 'smooth'}));
    
    this.dataService.fields.order.control.patchValue(
      {id: 'updated', name: 'Updated ↓'},
      {emitEvent: false}
    );
    this.dataService.serversideTableRequestData.sort$.next(['updated', 'desc']);
    this.dataService.updateRacksList$.next();
  }

  get hasMoreRacks(): boolean {
    const count = this.dataService.serversideAdditionalData.itemsCount$.value;
    const loaded = this.dataService.racksList$.value?.length ?? 0;
    return count > loaded;
  }

  get remainingRacksCount(): number {
    const count = this.dataService.serversideAdditionalData.itemsCount$.value;
    const loaded = this.dataService.racksList$.value?.length ?? 0;
    return Math.max(0, count - loaded);
  }
}