import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntil } from 'rxjs/operators';
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
export class ManufacturerBrowserRootComponent extends SubManager implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly formTypes = FormTypes;

  constructor(
    public readonly dataService: ManufacturerBrowserRootDataService,
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
  }

  ngOnInit(): void {
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
    
    this.dataService.serversideTableRequestData.skip$.next(0);
    this.dataService.serversideTableRequestData.take$.next(10);
    this.dataService.updateList$.next();
  }
}
