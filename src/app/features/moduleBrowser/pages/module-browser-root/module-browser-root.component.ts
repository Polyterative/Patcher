import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
}                                   from '@angular/core';
import { MatPaginator }             from '@angular/material/paginator';
import { Subject }                  from 'rxjs';
import { takeUntil }                from 'rxjs/operators';
import { ModuleBrowserDataService } from '../../module-browser-data.service';

@Component({
  selector:        'app-module-browser-root',
  templateUrl:     './module-browser-root.component.html',
  styleUrls:       ['./module-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserRootComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  
  constructor(public dataService: ModuleBrowserDataService) {
    
  }
  
  ngOnInit(): void {
    this.dataService.paginatorToFistPage$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.paginator.firstPage());
  
    this.dataService.serversideTableRequestData.skip$.next(0);
    this.dataService.serversideTableRequestData.take$.next(10);
    this.dataService.serversideTableRequestData.filter$.next('');
    this.dataService.updateModulesList$.next();
  
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
