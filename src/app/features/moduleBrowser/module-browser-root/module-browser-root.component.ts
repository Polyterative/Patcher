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
import { ModuleBrowserDataService } from '../module-browser-data.service';

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
    this.dataService.updateModulesList$.next();
    
    this.dataService.paginatorToFistPage$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.paginator.firstPage());
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
