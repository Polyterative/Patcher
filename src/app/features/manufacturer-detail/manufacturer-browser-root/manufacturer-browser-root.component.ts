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
import { MatPaginator } from '@angular/material/paginator';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Component({
  selector: 'app-manufacturer-browser-root',
  templateUrl: './manufacturer-browser-root.component.html',
  styleUrls: ['./manufacturer-browser-root.component.scss'],
  providers: [ManufacturerBrowserRootDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerBrowserRootComponent extends SubManager {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private readonly document = inject(DOCUMENT);
  readonly formTypes = FormTypes;

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
      .subscribe(() => this.paginator?.firstPage());
    
    this.dataService.pageEvent$
      .pipe(
        switchMap(() => this.dataService.manufacturers$.pipe(
          skip(1),
          take(1)
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.document.defaultView?.scrollTo({top: 0, behavior: 'smooth'}));
    
    this.dataService.serversideTableRequestData.skip$.next(0);
    this.dataService.serversideTableRequestData.take$.next(10);
    this.dataService.updateList$.next();
  }
}