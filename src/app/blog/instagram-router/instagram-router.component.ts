import {
    ChangeDetectionStrategy,
    Component
}                             from '@angular/core';
import { FormBuilder }        from '@angular/forms';
import { MatSnackBar }        from '@angular/material';
import { BehaviorSubject }    from 'rxjs';
import { FirebaseService }    from '../../Services/firebase.service';
import { RoutingService }     from '../../Services/routing.service';
import { AngularEntityBase }  from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }   from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService }  from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { InstagramLinkModel } from '../blog-models';

@Component({
    selector:        'app-instagram-router',
    templateUrl:     './instagram-router.component.html',
    styleUrls:       ['./instagram-router.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstagramRouterComponent extends AngularEntityBase {
    links: BehaviorSubject<InstagramLinkModel[]> = new BehaviorSubject<InstagramLinkModel[]>([]);
    
    constructor(
        private routing: RoutingService,
        private dataservice: FirebaseService,
        public constants: ConstantsService,
        public dimens: DimensionsService,
        private formBuilder: FormBuilder,
        public snackbar: MatSnackBar
    ) {
        super();
        
        // @ts-ignore
        dataservice.getInstagramList().subscribe(this.links);
    }
    
}
