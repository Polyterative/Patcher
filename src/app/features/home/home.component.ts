import {
    Component,
    OnDestroy
}                  from '@angular/core';
import { Router }  from '@angular/router';
import { Subject } from 'rxjs';
import {
    CardLinkDataModel,
    cleanCardlinkModelObject
}                  from '../../shared-interproject/components/@smart/list-link-router/clickable-list-card-base';

@Component({
    selector:    'app-home',
    templateUrl: './home.component.html'
})
export class HomeComponent implements OnDestroy {
    iconColor = '#041E50';
    
    destroyEvent$: Subject<void> = new Subject();
    
    readonly linksData: CardLinkDataModel = {
        ...cleanCardlinkModelObject,
        links: []
    };
    
    constructor(
        private router: Router
    ) {
    }
    
    ngOnDestroy(): void {
        this.destroyEvent$.next();
        this.destroyEvent$.complete();
    }
    
}
