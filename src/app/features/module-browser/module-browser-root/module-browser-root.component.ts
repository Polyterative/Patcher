import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
}                                   from '@angular/core';
import { MatPaginator }             from '@angular/material/paginator';
import { Subject }                  from 'rxjs';
import { takeUntil }                from 'rxjs/operators';
import { ModuleBrowserDataService } from 'src/app/features/module-browser/module-browser-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                   from '../../../components/module-parts/module-minimal/module-minimal.component';
import { SeoAndUtilsService }       from '../../backbone/seo-and-utils.service';

@Component({
  selector:        'app-module-browser-root',
  templateUrl:     './module-browser-root.component.html',
  styleUrls:       ['./module-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserRootComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Input() readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons:      true,
    hideDates:        false,
    hideDescription:  false,
    hideHP:           false,
    hideTags:         false,
    hideManufacturer: false,
    hideLabels:       true
  };
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dataService: ModuleBrowserDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    
    this.dataService.paginatorToFistPage$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.paginator.firstPage());
    
    if (!this.dataService.dirty) {
      this.dataService.fields.order.control.patchValue({
        id:   'updated',
        name: 'Updated ↓'
      });
      
      this.dataService.serversideTableRequestData.skip$.next(0);
      this.dataService.serversideTableRequestData.take$.next(20);
    }
    
    this.seoAndUtilsService.updateSeo({description: 'Eurorack and Intellijel 1U modules database and finder. Filter by function or flavor. Discover new interesting modules.'}, 'Modules');
  }
  
  ngOnInit(): void {
    // this.dataService.fields.search.control.patchValue('');
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
