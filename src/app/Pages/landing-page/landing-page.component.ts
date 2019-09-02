import {
    Component,
    EventEmitter
}                             from '@angular/core';
import { AngularFirestore }   from '@angular/fire/firestore';
import {
    FormBuilder,
    FormControl,
    Validators
}                             from '@angular/forms';
import { MatSnackBar }        from '@angular/material/snack-bar';
import {
    Observable,
    of
}                             from 'rxjs';
import {
    bufferCount,
    concatMap,
    debounceTime,
    filter,
    map,
    switchMap,
    take,
    takeUntil,
    tap
}                             from 'rxjs/operators';
import { FormTypes }          from '../../Utils/LocalLibraries/mat-form-entity/form-element-models';
import { AngularEntityBase }  from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }   from '../../Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService }  from '../../Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { CommunicationUtils } from '../../Utils/LocalLibraries/VioletUtilities/general-utils';
import { MessageModel }       from './message.model';

interface ServerStatsModel {
    visits: number;
    usersConnected: number;
}

@Component({
    selector:    'app-langing-page',
    templateUrl: './landing-page.component.html',
    styleUrls:   ['./landing-page.component.scss']
})
export class LandingPageComponent extends AngularEntityBase {
    messages$: Observable<Array<Array<MessageModel>>>;
    serverStats$: Observable<ServerStatsModel>;
    messageAdder = {
        controls:  {
            content: new FormControl('', Validators.compose([
                Validators.maxLength(144),
                Validators.minLength(5),
                Validators.required
            ]))
        },
        formGroup: this.formBuilder.group({
            hideRequired: false,
            floatLabel:   'always' // can be auto|always|never
        }),
        type:      FormTypes.TEXT,
        confirm:   new EventEmitter<void>()
    };
    private messagePath = 'messages';
    private general = 'general';

    // const genericDeleteErrorHandler = catchError(_ => {
    //     this.pageState.state$.next(PageState.ERROR);
    //     this.Log.error(_.toString());
    //     CommunicationUtils.showSnackbar(
    //       this.snackbar,
    //       `Errore cancellazione`,
    //       10000
    //     );
    //     return EMPTY; // stop flow
    //   }
    // );
    //

    // errorProvider = (formControl: FormControl) => LocalFormUtils.getPossibleErrors(formControl)

    constructor(db: AngularFirestore, public constants: ConstantsService, public dimens: DimensionsService, private formBuilder: FormBuilder, public snackbar: MatSnackBar) {
        super();

        // @ts-ignore
        this.messages$ = db.collection(this.messagePath, ref => ref.limit(10).orderBy('when', 'desc'))
          .valueChanges()
          .pipe(switchMap(x => of(x)
            .pipe(concatMap(y => y),
              bufferCount(3),
              bufferCount(Number.MAX_VALUE)
            )
            )
          )
        ;

        // db.collection(this.messagePath)

        this.serverStats$ = db.collection(this.general, ref => ref.limit(1)).valueChanges().pipe(map((x: any) => x[0]));

        this.performVisitsOperation(db, value => (value + 1));

        this.setupForm(db);

    }

    private setupForm(db: AngularFirestore) {

        this.messageAdder.formGroup.addControl('content', this.messageAdder.controls.content);

        this.messageAdder.confirm
          .pipe(
            map(_ => this.messageAdder.controls.content.value),
            tap(_ => this.messageAdder.controls.content.reset())
          )
          .subscribe(x => {

              const message: MessageModel = {
                  content:  x,
                  title:    'T',
                  when:     new Date().toUTCString(),
                  subtitle: 'Anonimo'
              };

              db.collection(this.messagePath)
                .add(message);

              CommunicationUtils.showSnackbar(this.snackbar, 'Aggiunto');

          });

        this.messageAdder.controls.content.valueChanges
          .pipe(
            debounceTime(2000),
            map(_ => this.messageAdder.controls.content),
            filter(x => x.value !== null),
            takeUntil(this.destroyEvent$)
          )
          .subscribe(x => {
              x.markAsTouched({onlySelf: true});
              x.updateValueAndValidity();
          });
    }

    private performVisitsOperation(db: AngularFirestore, func: (val) => number) {
        db.collection(this.general)
          .get()
          .pipe(take(1))
          .subscribe(x => {
              const documentSnapshot = x.docs[0];
              const oldObj = documentSnapshot.data();

              oldObj.visits = func(oldObj.visits);

              db.collection(this.general)
                .doc(documentSnapshot.id)
                .update(oldObj);
          });
    }
}
