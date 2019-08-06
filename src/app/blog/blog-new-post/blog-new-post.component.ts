import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  EventEmitter
}                             from '@angular/core';
import { AngularFirestore }   from '@angular/fire/firestore';
import {
  FormBuilder,
  FormControl,
  Validators
}                             from '@angular/forms';
import { MatSnackBar }        from '@angular/material';
import { ActivatedRoute }     from '@angular/router';
import { DateTime }           from 'luxon';
import {
  map,
  tap
}                             from 'rxjs/operators';
import { FormTypes }          from '../../Utils/LocalLibraries/mat-form-entity/form-element-models';
import { AngularEntityBase }  from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }   from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService }  from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { CommunicationUtils } from '../../Utils/LocalLibraries/VioletUtilities/general-utils';
import { BlogPostModel }      from '../blog-view/blog-view.component';

@Component({
  selector:        'app-blog-new-post',
  templateUrl:     './blog-new-post.component.html',
  styleUrls:       ['./blog-new-post.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogNewPostComponent extends AngularEntityBase {
  
  controls = {
    title:    new FormControl('', Validators.compose([Validators.required])),
    subtitle: new FormControl('', Validators.compose([Validators.required])),
    category: new FormControl('', Validators.compose([Validators.required])),
    content:  new FormControl('', Validators.compose([Validators.required]))
  };
  
  formTypes = FormTypes;
  
  confirm = new EventEmitter<void>();
  
  private blogPostPath = 'blogPosts';
  
  constructor(private route: ActivatedRoute,
              private db: AngularFirestore,
              public constants: ConstantsService,
              public dimens: DimensionsService,
              public snackbar: MatSnackBar) {
    super();
    
    this.confirm
      .pipe(
        map(_ => {
          
          const dateTime = DateTime.local();
          const message: BlogPostModel = {
            content:  this.controls.content.value,
            title:    this.controls.title.value,
            subtitle: this.controls.subtitle.value,
            category: this.controls.category.value,
            created:  dateTime.toISO(),
            updated:  dateTime.toISO(),
            id:       3
          };
          
          
          return message;
        })
        // tap(_ => this.controls.content.reset())
      )
      .subscribe(x => {
        
        
        db.collection(this.blogPostPath).add(x);
        
        CommunicationUtils.showSnackbar(this.snackbar, 'Aggiunto');
        
      });
    
  }
  
  
}
