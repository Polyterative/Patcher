import {
    ChangeDetectionStrategy,
    Component,
    Input
}                          from '@angular/core';
import { environment }     from '../../../environments/environment';
import { FirebaseService } from '../../Services/firebase.service';
import { RoutingService }  from '../../Services/routing.service';
import {
    BlogEntryModel,
    CategoryColors
}                          from '../blog-models';

@Component({
    selector:        'app-blog-post-structure',
    templateUrl:     './blog-post-structure.component.html',
    styleUrls:       ['./blog-post-structure.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostStructureComponent {
    @Input()
    post: BlogEntryModel;

    @Input()
    noSubtitle = false;

    @Input()
    noDates = false;

    @Input()
    noContent = false;

    @Input()
    noSpacer = false;

    palette = CategoryColors;
    development = !environment.production;

    constructor(private routing: RoutingService, public dataservice: FirebaseService) {
    }
}
