import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter
}                             from '@angular/core';
import {
  FormControl,
  Validators
}                             from '@angular/forms';
import { MatSnackBar }        from '@angular/material';
import { ActivatedRoute }     from '@angular/router';
import { DateTime }           from 'luxon';
import { map }                from 'rxjs/operators';
import { FirebaseService }    from '../../Services/firebase.service';
import {
  FormTypes,
  Selectable
}                             from '../../Utils/LocalLibraries/mat-form-entity/form-element-models';
import { AngularEntityBase }  from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }   from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService }  from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { CommunicationUtils } from '../../Utils/LocalLibraries/VioletUtilities/general-utils';
import { BlogPostModel }      from '../blog-models';

@Component({
  selector:        'app-blog-new-post',
  templateUrl:     './blog-new-post.component.html',
  styleUrls:       ['./blog-new-post.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogNewPostComponent extends AngularEntityBase {
  controls = {
    title:    new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(5)
    ])),
    subtitle: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(5)
    ])),
    slug:     new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(5)
    ])),
    category: new FormControl('', Validators.compose([Validators.required])),
    kind:     new FormControl('', Validators.compose([Validators.required])),
    content:  new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(5)
    ]))
  };
  formTypes = FormTypes;
  confirm = new EventEmitter<void>();
  kindOptions: Selectable[] = [
    {id: 0, name: 'Page'},
    {id: 1, name: 'Post'}
  ];
  
  private blogPostPath = 'blogPosts';
  
  constructor(private route: ActivatedRoute,
              private dataservice: FirebaseService,
              public constants: ConstantsService,
              public dimens: DimensionsService,
              public snackbar: MatSnackBar) {
    super();
    
    this.confirm
      .pipe(
        map(() => {
          const dateTime = DateTime.local();
          const message: BlogPostModel = {
            content:  this.controls.content.value,
            title:    this.controls.title.value,
            subtitle: this.controls.subtitle.value,
            category: this.controls.category.value,
            slug:     this.controls.slug.value,
            created:  dateTime.toISO(),
            updated:  dateTime.toISO()
          };
          
          return message;
        })
        // tap(_ => this.controls.content.reset())
      )
      .subscribe(x => {
  
        // tslint:disable-next-line:triple-equals
        const path = this.controls.kind.value == 1 ? this.dataservice.blogPostPath : this.dataservice.pagesPath;
  
        dataservice.add(path, x);
        
        CommunicationUtils.showSnackbar(this.snackbar, 'Aggiunto');
        
      });
    
  }
  
}
