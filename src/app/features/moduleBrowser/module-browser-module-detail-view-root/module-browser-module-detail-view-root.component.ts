import {
    Component,
    OnInit
}                                   from '@angular/core';
import { ActivatedRoute }           from '@angular/router';
import {
    BehaviorSubject,
    Subject
}                                   from 'rxjs';
import {
    filter,
    map,
    switchMap
}                                   from 'rxjs/operators';
import { DBEuroModule }             from '../../../models/models';
import { FirebaseService }          from '../../backend/firebase.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:    'app-module-browser-module-detail-view-root',
    templateUrl: './module-browser-module-detail-view-root.component.html',
    styleUrls:   ['./module-browser-module-detail-view-root.component.scss']
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleDetailViewRootComponent implements OnInit {
    data$ = new BehaviorSubject<DBEuroModule | undefined>(undefined);
    updateData$ = new Subject<number>();
    
    constructor(
      public dataService: ModuleBrowserDataService,
      public api: FirebaseService,
      public route: ActivatedRoute
    ) {
    
        this.updateData$
            .pipe(switchMap(x => dataService.backend.get.euromoduleWithId(x)))
            .subscribe(x => this.data$.next(x.data));
    
        this.route.params
            .pipe(
              map(x => (x && x.id && parseInt(x.id) ? parseInt(x.id) : 0)),
              filter(x => x > 0)
            )
            .subscribe(data => {
                // debugger
                this.updateData$.next(data);
            });
        //
        // dataService.backend.get.euromoduleWithId(72)
        //            .subscribe(value => console.log(value));
    }
    
    ngOnInit(): void {
    }
    
}