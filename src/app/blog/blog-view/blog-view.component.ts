import { Component }         from '@angular/core';
import { AngularFirestore }  from '@angular/fire/firestore';
import { FormBuilder }       from '@angular/forms';
import { MatSnackBar }       from '@angular/material';
import { BehaviorSubject }   from 'rxjs';
import { debounceTime }      from 'rxjs/operators';
import { RoutingService }    from '../../Services/routing.service';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';

enum Category {
  'Music',
  'Code',
  'Productivity'
}

export interface BlogPostModel {
  title: string;
  subtitle: string;
  content: string;
  id: number;
  created: string;
  updated: string;
  category: Category;
}

@Component({
  selector:    'app-blog-view',
  templateUrl: './blog-view.component.html',
  styleUrls:   ['./blog-view.component.scss']
})
export class BlogViewComponent extends AngularEntityBase {
  messages$: BehaviorSubject<BlogPostModel[]> = new BehaviorSubject<BlogPostModel[]>([]);
  
  private blogPostPath = 'blogPosts';
  
  constructor(
    private routing: RoutingService,
    db: AngularFirestore,
    public constants: ConstantsService,
    public dimens: DimensionsService,
    private formBuilder: FormBuilder,
    public snackbar: MatSnackBar
  ) {
    super();
    
    // @ts-ignore
    db.collection(
      this.blogPostPath,
      ref => ref.limit(10)
        .orderBy('id', 'desc')
    )
      .valueChanges()
      .pipe(
        debounceTime(250)
      )
      .subscribe(this.messages$)
    ;
    
    this.messages$.subscribe(x => {
      console.error(x);
    });
  }
  
}
