import { Component }         from '@angular/core';
import { FormBuilder }       from '@angular/forms';
import { MatSnackBar }       from '@angular/material';
import { ActivatedRoute }    from '@angular/router';
import { BehaviorSubject }   from 'rxjs';
import { switchMap }         from 'rxjs/operators';
import { FirebaseService }   from '../../Services/firebase.service';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { BlogPostModel }     from '../blog-models';

@Component({
  selector:    'app-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls:   ['./blog-post.component.scss']
})
export class BlogPostComponent extends AngularEntityBase {
  post$: BehaviorSubject<BlogPostModel | undefined> = new BehaviorSubject<BlogPostModel>(undefined);
  
  constructor(private route: ActivatedRoute,
              private dataservice: FirebaseService,
              public constants: ConstantsService,
              public dimens: DimensionsService,
              private formBuilder: FormBuilder,
              public snackbar: MatSnackBar) {
    super();
  
    this.route.params
      .pipe(switchMap(x => dataservice.getBlogPost(x.slug)))
      .subscribe(this.post$);
  
  }
  
}
