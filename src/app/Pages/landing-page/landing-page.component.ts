import {
  Component,
  EventEmitter
}                            from '@angular/core';
import { AngularFirestore }  from '@angular/fire/firestore';
import {
  FormBuilder,
  FormControl
}                            from '@angular/forms';
import {
  Observable,
  of
}                            from 'rxjs';
import {
  bufferCount,
  concatMap,
  map,
  switchMap,
  take,
  tap
}                            from 'rxjs/operators';
import { MessageModel }      from 'src/app/Pages/landing-page/message.model';
import { FormTypes }         from 'src/app/Utils/LocalLibraries/mat-form-entity/form-element-models';
import { AngularEntityBase } from 'src/app/Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { ConstantsService }  from 'src/app/Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from 'src/app/Utils/LocalLibraries/VioletUtilities/dimensions.service';

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
  messages$: Observable<MessageModel[][]>;
  serverStats$: Observable<ServerStatsModel>;
  messageAdder = {
    controls:  {
      content: new FormControl()
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
  
  constructor(db: AngularFirestore, public constants: ConstantsService, public dimens: DimensionsService, private formBuilder: FormBuilder) {
    super(constants, dimens);
    
    // @ts-ignore
    this.messages$ = db.collection(this.messagePath, ref => ref.limit(10))
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
        tap(_ => this.messageAdder.controls.content.patchValue(''))
      )
      .subscribe(x => {
        
        const message: MessageModel = {
          content:  x,
          title:    'T',
          when:     new Date().toUTCString(),
          subtitle: 'S'
        };
        
        db.collection(this.messagePath)
          .add(message);
        
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
