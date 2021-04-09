import {
    Component,
    OnInit
}                                   from '@angular/core';
import { ActivatedRoute }           from '@angular/router';
import {
    filter,
    map,
    switchMap
}                                   from 'rxjs/operators';
import { LocalEuroModule }          from '../../../models/models';
import { FirebaseService }          from '../../backend/firebase.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-browser-module-detail-view-root',
    templateUrl:     './module-browser-module-detail-view-root.component.html',
    styleUrls:       ['./module-browser-module-detail-view-root.component.scss'],
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleDetailViewRootComponent implements OnInit {
    data: LocalEuroModule;
    
    constructor(
      public dataService: ModuleBrowserDataService,
      public api: FirebaseService,
      public route: ActivatedRoute
    ) {
    
        this.route.params
            .pipe(
              map(x => (x && x.id ? x.id : '')),
              filter(value => value.length > 0),
              switchMap(x => dataService.storage.getModuleWithId(x))
            )
            .subscribe(x => this.data = x);
    }
    
    ngOnInit(): void {
    }
    
}