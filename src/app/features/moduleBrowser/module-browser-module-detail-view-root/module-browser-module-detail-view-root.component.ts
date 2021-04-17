import {
  Component,
  OnInit
}                                   from '@angular/core';
import { ActivatedRoute }           from '@angular/router';
import { Subject }                  from 'rxjs';
import {
  filter,
  map,
  take
}                                   from 'rxjs/operators';
import { FirebaseService }          from '../../backend/firebase.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
  selector:    'app-module-browser-module-detail-view-root',
  templateUrl: './module-browser-module-detail-view-root.component.html',
  styleUrls:   ['./module-browser-module-detail-view-root.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleDetailViewRootComponent implements OnInit {
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  constructor(
    public dataService: ModuleBrowserDataService,
    public api: FirebaseService,
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
          this.dataService.updateSingleModuleData$.next(data);
        });
  }
  
  ngOnDestroy(): void {
    this.dataService.singleModuleData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
