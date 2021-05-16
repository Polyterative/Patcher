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
    
  }
  
  ngOnInit(): void {
    // this.dataService.fields.search.control.patchValue('');
    this.dataService.paginatorToFistPage$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.paginator.firstPage());
  
  
    // if (!this.dataService.dirty) {
    //   this.dataService.serversideTableRequestData.filter$.next('');
    //  
    // }
  
    this.dataService.serversideTableRequestData.skip$.next(0);
    this.dataService.serversideTableRequestData.take$.next(10);
    this.dataService.updatePatchesList$.next();
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
