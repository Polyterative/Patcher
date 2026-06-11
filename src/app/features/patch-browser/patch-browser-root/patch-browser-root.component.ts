import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { merge, Observable } from 'rxjs';
import {
  mapTo,
  shareReplay,
  startWith,
  takeUntil
} from 'rxjs/operators';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Component({
  selector: 'app-patch-browser-root',
  templateUrl: './patch-browser-root.component.html',
  styleUrls: ['./patch-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchBrowserRootComponent extends SubManager {
  readonly formTypes = FormTypes;
  readonly patchesUpdating$: Observable<boolean>;
  readonly viewConfig: PatchMinimalViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: true,
    hideDates:   false
  };

  get hasMorePatches(): boolean {
    const total = this.dataService.serversideAdditionalData.itemsCount$.value;
    const loaded = this.dataService.patchesList$.value?.length ?? 0;
    return loaded < total;
  }

  get remainingPatchesCount(): number {
    const total = this.dataService.serversideAdditionalData.itemsCount$.value;
    const loaded = this.dataService.patchesList$.value?.length ?? 0;
    return Math.max(0, total - loaded);
  }

  loadMore(): void {
    this.dataService.loadMore$.next();
  }

  constructor(
    public dataService: PatchBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    this.patchesUpdating$ = merge(
      this.dataService.updatePatchesList$.pipe(mapTo(true)),
      this.dataService.patchesList$.pipe(mapTo(false))
    ).pipe(
      startWith(false),
      shareReplay({bufferSize: 1, refCount: true}),
      takeUntil(this.destroy$)
    );
    
    this.seoAndUtilsService.updateSeo(
      {description: 'Patches created by patcher.xyz community. Get inspiration and explore new ideas!'},
      'Patches'
    );

    this.dataService.fields.order.control.patchValue(
      {id: 'updated', name: 'Updated ↓'},
      {emitEvent: false}
    );
    this.dataService.serversideTableRequestData.sort$.next(['updated', 'desc']);
    this.dataService.updatePatchesList$.next();
  }
}