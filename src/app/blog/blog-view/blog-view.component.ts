import { Component }         from '@angular/core';
import { FormBuilder }       from '@angular/forms';
import { MatSnackBar }       from '@angular/material';
import { BehaviorSubject }   from 'rxjs';
import { FirebaseService }   from '../../Services/firebase.service';
import { RoutingService }    from '../../Services/routing.service';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { BlogEntryModel }    from '../blog-models';

@Component({
  selector:    'app-blog-view',
  templateUrl: './blog-view.component.html',
  styleUrls:   ['./blog-view.component.scss']
})
export class BlogViewComponent extends AngularEntityBase {
  posts$: BehaviorSubject<BlogEntryModel[]> = new BehaviorSubject<BlogEntryModel[]>([]);
  
  private blogPostPath = 'blogPosts';
  
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
    dataservice.getBlogPosts(10).subscribe(this.posts$);
  }
  
}
