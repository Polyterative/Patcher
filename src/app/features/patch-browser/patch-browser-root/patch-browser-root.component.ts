import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  skip,
  switchMap,
  take,
  takeUntil
} from 'rxjs/operators';
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
  private readonly document = inject(DOCUMENT);

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
    
    this.dataService.pageEvent$
      .pipe(
        switchMap(() => this.dataService.patchesList$.pipe(
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
    this.dataService.updatePatchesList$.next();
  }
}