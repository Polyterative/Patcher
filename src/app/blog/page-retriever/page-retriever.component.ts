import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                            from '@angular/core';
import { FormBuilder }       from '@angular/forms';
import { MatSnackBar }       from '@angular/material';
import { ActivatedRoute }    from '@angular/router';
import { BehaviorSubject }   from 'rxjs';
import { FirebaseService }   from '../../Services/firebase.service';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { BlogEntryModel }    from '../blog-models';

@Component({
  selector:        'app-page-retriever',
  templateUrl:     './page-retriever.component.html',
  styleUrls:       ['./page-retriever.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageRetrieverComponent extends AngularEntityBase implements OnInit {
  
  page$: BehaviorSubject<BlogEntryModel | undefined> = new BehaviorSubject<BlogEntryModel>(undefined);
  
  @Input()
  private pageSlug: string;
  
  constructor(private route: ActivatedRoute,
              private dataservice: FirebaseService,
              public constants: ConstantsService,
              public dimens: DimensionsService,
              private formBuilder: FormBuilder,
              public snackbar: MatSnackBar) {
    super();
    
  }
  
  ngOnInit(): void {
    
    console.warn(this.pageSlug);
    this.dataservice.getPage(this.pageSlug).subscribe(this.page$);
  }
  
}
