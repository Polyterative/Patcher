import {
  ChangeDetectionStrategy,
  Component,
  ViewChild
} from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { MatPaginator } from '@angular/material/paginator';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Component({
  selector: 'app-patch-browser-root',
  templateUrl: './patch-browser-root.component.html',
  styleUrls: ['./patch-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchBrowserRootComponent extends SubManager {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  readonly formTypes = FormTypes;
  readonly viewConfig: PatchMinimalViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: true,
    hideDates:   false
  };

  constructor(
    public dataService: PatchBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    
    this.seoAndUtilsService.updateSeo(
      {description: 'Patches created by patcher.xyz community. Get inspiration and explore new ideas!'},
      'Patches'
    );

    this.dataService.paginatorToFistPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.paginator.firstPage());
    
    this.dataService.fields.order.control.patchValue(
      {id: 'updated', name: 'Updated ↓'},
      {emitEvent: false}
    );
    this.dataService.serversideTableRequestData.sort$.next(['updated', 'desc']);
    this.dataService.serversideTableRequestData.skip$.next(0);
    this.dataService.serversideTableRequestData.take$.next(10);
    this.dataService.updatePatchesList$.next();
  }
}