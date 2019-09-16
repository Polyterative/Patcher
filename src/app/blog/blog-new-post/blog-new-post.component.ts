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
import { BehaviorSubject }    from 'rxjs';
import {
    filter,
    map,
    switchMap,
    take,
    takeUntil,
    withLatestFrom
}                             from 'rxjs/operators';
import { FirebaseService }    from '../../Services/firebase.service';
import {
    FormTypes,
    Selectable
}                             from '../../Utils/LocalLibraries/mat-form-entity/form-element-models';
import { AngularEntityBase }  from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }   from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService }  from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { CommunicationUtils } from '../../Utils/LocalLibraries/VioletUtilities/general-utils';
import { BlogEntryModel }     from '../blog-models';

@Component({
    selector:        'app-blog-new-post',
    templateUrl:     './blog-new-post.component.html',
    styleUrls:       ['./blog-new-post.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogNewPostComponent extends AngularEntityBase {  // TODO rename this
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
        created:  new FormControl('', Validators.compose([Validators.required])),
        updated:  new FormControl('', Validators.compose([Validators.required])),
        kind:     new FormControl('', Validators.compose([Validators.required])),
        content:  new FormControl('', Validators.compose([
            Validators.required,
            Validators.minLength(5)
        ]))
    };
    
    edit = {
        postOptions: new BehaviorSubject<Array<Selectable>>([])
    };
    
    formTypes = FormTypes;
    confirm = new EventEmitter<void>();
    kindOptions: Array<Selectable> = [
        {id: '0', name: 'Page'},
        {id: '1', name: 'Post'}
    ];
    isEditing: BehaviorSubject<boolean> = new BehaviorSubject(false);
    
    // post$: BehaviorSubject<BlogEntryModel | undefined> = new BehaviorSubject<BlogEntryModel>(undefined);
    
    constructor(private route: ActivatedRoute,
                private dataservice: FirebaseService,
                public constants: ConstantsService,
                public dimens: DimensionsService,
                public snackbar: MatSnackBar) {
        super();
        
        this.route.params
            .pipe(
                map(x => x.slug),
                filter(x => x),
                take(1),
                switchMap(x => dataservice.getBlogPost(x))
            )
            .subscribe((x: BlogEntryModel) => {
                this.isEditing.next(true);
                this.controls.slug.patchValue(x.slug);
                this.controls.title.patchValue(x.title);
                this.controls.subtitle.patchValue(x.subtitle);
                this.controls.kind.patchValue('1');
                this.controls.content.patchValue(x.content);
                this.controls.created.patchValue(x.created);
                this.controls.updated.patchValue(x.updated);
            });
        
        this.confirm
            .pipe(
                takeUntil(this.destroyEvent$),
                map(() => {
                    const dateTime = DateTime.local().toISO();
                    
                    this.controls.updated.patchValue(dateTime);
                    
                    if (!this.isEditing) {
                        this.controls.created.patchValue(dateTime);
                    }
                    
                    const message: BlogEntryModel = {
                        public:   true,
                        content:  this.controls.content.value,
                        title:    this.controls.title.value,
                        subtitle: this.controls.subtitle.value,
                        category: this.controls.category.value,
                        slug:     this.controls.slug.value,
                        created:  this.controls.created.value,
                        updated:  this.controls.updated.value
                    };
                    
                    return message;
                }),
                withLatestFrom(this.isEditing),
                map(x => [
                    x[0],
                    // tslint:disable-next-line:triple-equals
                    this.controls.kind.value == '1' ? this.dataservice.blogPostPath : this.dataservice.pagesPath,
                    x[1]
                ]),
                switchMap((x: [BlogEntryModel, string, boolean]) => {
                    const path = x[0];
                    const data = x[1];
                    const isEditing = x[2];
                    
                    const slug = this.controls.slug.value;
                    
                    return isEditing ? dataservice.editPost(path, slug, data) : dataservice.add(data, path);
                })
                // tap(_ => this.controls.content.reset())
            )
            .subscribe(x => {
                
                CommunicationUtils.showSnackbar(this.snackbar, 'Aggiunto');
            });
        
        dataservice.getBlogPosts()
            .pipe(map(x => x.map((y: BlogEntryModel) => ({id: y.slug, name: y.title}))))
            .subscribe(this.edit.postOptions);
        
    }
    
}
