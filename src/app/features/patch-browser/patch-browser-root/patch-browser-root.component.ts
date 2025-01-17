import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { MatPaginator } from "@angular/material/paginator";


@Component({
  selector:        'app-patch-browser-root',
  templateUrl:     './patch-browser-root.component.html',
  styleUrls:       ['./patch-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBrowserRootComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  viewConfig: PatchMinimalViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: true,
    hideDates:   false
  };
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dataService: PatchBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    
    this.seoAndUtilsService.updateSeo({description: 'Patches created by patcher.xyz community. Get inspiration and explore new ideas!'}, 'Patches');
    
    this.dataService.paginatorToFistPage$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.paginator.firstPage());
    
    if (!this.dataService.dirty) {
      this.dataService.fields.order.control.patchValue({
        id:   'updated',
        name: 'Updated ↓'
      });
      
      this.dataService.serversideTableRequestData.skip$.next(0);
      this.dataService.serversideTableRequestData.take$.next(10);
    }
  }
  
  ngOnInit(): void {
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}