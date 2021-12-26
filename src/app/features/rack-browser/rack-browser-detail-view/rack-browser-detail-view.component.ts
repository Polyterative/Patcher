import {
  Component,
  OnInit
}                                from '@angular/core';
import { ActivatedRoute }        from '@angular/router';
import { Subject }               from 'rxjs';
import {
  filter,
  map,
  take
}                                from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';

@Component({
  selector:    'app-rack-browser-rack-detail-view-root',
  templateUrl: './rack-browser-detail-view.component.html',
  styleUrls:   ['./rack-browser-detail-view.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackBrowserDetailViewComponent implements OnInit {
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dataService: RackDetailDataService,
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
          this.dataService.updateSingleRackData$.next(data);
        });
  }
  
  ngOnDestroy(): void {
    this.dataService.singleRackData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
