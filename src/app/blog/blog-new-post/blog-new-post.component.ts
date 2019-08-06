import {
  Component,
  OnInit,
  ChangeDetectionStrategy
}                            from '@angular/core';
import { AngularFirestore }  from '@angular/fire/firestore';
import { FormBuilder }       from '@angular/forms';
import { MatSnackBar }       from '@angular/material';
import { ActivatedRoute }    from '@angular/router';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';

@Component({
  selector:        'app-blog-new-post',
  templateUrl:     './blog-new-post.component.html',
  styleUrls:       ['./blog-new-post.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogNewPostComponent extends AngularEntityBase {
  
  constructor(private route: ActivatedRoute,
              private db: AngularFirestore,
              public constants: ConstantsService,
              public dimens: DimensionsService,
              public snackbar: MatSnackBar) {
    super(constants, dimens);
    
  }
  
}
