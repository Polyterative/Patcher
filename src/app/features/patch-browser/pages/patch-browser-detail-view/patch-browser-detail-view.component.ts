import {
  Component,
  OnInit
}                                 from '@angular/core';
import { ActivatedRoute }         from '@angular/router';
import { Subject }                from 'rxjs';
import {
  filter,
  map,
  take
}                                 from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';

@Component({
  selector:    'app-patch-browser-patch-detail-view-root',
  templateUrl: './patch-browser-detail-view.component.html',
  styleUrls:   ['./patch-browser-detail-view.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBrowserDetailViewComponent implements OnInit {
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  constructor(
    public dataService: PatchDetailDataService,
    public route: ActivatedRoute
  ) {
    
  }
  
  ngOnInit(): void {
    
    this.route.params
        .pipe(
          map(x => x && x.id && parseInt(x.id) ? parseInt(x.id) : 0),
          filter(x => x > 0),
          take(1)
        )
        .subscribe(data => {
          // debugger
          this.dataService.updateSinglePatchData$.next(data);
        });
  }
  
  ngOnDestroy(): void {
    this.dataService.singlePatchData$.next(undefined);
    this.dataService.patchEditingPanelOpenState$.next(false);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
