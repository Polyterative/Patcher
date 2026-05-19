import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  merge,
  Observable
} from 'rxjs';
import {
  mapTo,
  shareReplay,
  startWith,
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
  readonly formTypes = FormTypes;
  readonly racksUpdating$: Observable<boolean>;
  readonly viewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};

  constructor(
    public dataService: RackBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    this.racksUpdating$ = merge(
      this.dataService.updateRacksList$.pipe(mapTo(true)),
      this.dataService.racksList$.pipe(mapTo(false))
    ).pipe(
      startWith(false),
      shareReplay({bufferSize: 1, refCount: true}),
      takeUntil(this.destroy$)
    );
    
    this.seoAndUtilsService.updateSeo(
      {description: 'Racks created by patcher.xyz community. Get inspired and explore new possibilities!'},
      'Racks'
    );

    this.dataService.fields.order.control.patchValue(
      {id: 'updated', name: 'Updated ↓'},
      {emitEvent: false}
    );
    this.dataService.serversideTableRequestData.sort$.next(['updated', 'desc']);
    this.dataService.updateRacksList$.next();
  }
}