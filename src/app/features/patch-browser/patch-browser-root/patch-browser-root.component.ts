import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
}                                  from '@angular/core';
import { MatPaginator }            from '@angular/material/paginator';
import { Subject }                 from 'rxjs';
import { takeUntil }               from 'rxjs/operators';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';

@Component({
  selector:        'app-patch-browser-root',
  templateUrl:     './patch-browser-root.component.html',
  styleUrls:       ['./patch-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBrowserRootComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  
  constructor(public dataService: PatchBrowserDataService) {
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
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
