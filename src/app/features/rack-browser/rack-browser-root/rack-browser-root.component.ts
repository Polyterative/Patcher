import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
}                                 from '@angular/core';
import { MatPaginator }           from '@angular/material/paginator';
import { Subject }                from 'rxjs';
import { takeUntil }              from 'rxjs/operators';
import { RackBrowserDataService } from 'src/app/features/rack-browser/rack-browser-data.service';
import { SeoAndUtilsService }     from '../../backbone/seo-and-utils.service';

@Component({
  selector:        'app-rack-browser-root',
  templateUrl:     './rack-browser-root.component.html',
  styleUrls:       ['./rack-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackBrowserRootComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dataService: RackBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    
    this.seoAndUtilsService.updateSeo({description: 'Racks created by patcher.xyz community. Get inspired and explore new possibilities!'}, 'Racks');
    
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
