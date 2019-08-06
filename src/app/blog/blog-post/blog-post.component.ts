import { Component }         from '@angular/core';
import { AngularFirestore }  from '@angular/fire/firestore';
import { FormBuilder }       from '@angular/forms';
import { MatSnackBar }       from '@angular/material';
import { ActivatedRoute }    from '@angular/router';
import { BehaviorSubject }   from 'rxjs';
import {
  map,
  switchMap,
  tap
}                            from 'rxjs/operators';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { BlogPostModel }     from '../blog-view/blog-view.component';

@Component({
  selector:    'app-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls:   ['./blog-post.component.scss']
})
export class BlogPostComponent extends AngularEntityBase {
  
  post$: BehaviorSubject<BlogPostModel | undefined> = new BehaviorSubject<BlogPostModel>(undefined);
  private blogPostPath = 'blogPosts';
  
  constructor(private route: ActivatedRoute,
              private db: AngularFirestore,
              public constants: ConstantsService,
              public dimens: DimensionsService,
              private formBuilder: FormBuilder,
              public snackbar: MatSnackBar) {
    super();
  
    this.route.params
      .pipe(
        tap(x => console.warn(x)),
        switchMap(x =>
          this.db.collection(
            this.blogPostPath,
            ref => ref.limit(1)
              .where('id', '==', parseInt(x.id, 10))
          )
            .get()
        ),
        map(x => x.docs[0].data()),
        // tap(x => console.warn(x))
      )
      .subscribe(this.post$);
  
    this.post$.subscribe(a => console.log(a));
  
  }
  
  ngOnInit() {
  }
  
}
