import {
  Component,
  OnInit
}                           from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import {
  Observable,
  of
}                           from 'rxjs';
import {
  bufferCount,
  concatMap,
  switchMap,
  tap
}                           from 'rxjs/operators';
import { MessageModel }     from 'src/app/Pages/landing-page/message.model';

@Component({
  selector:    'app-langing-page',
  templateUrl: './landing-page.component.html',
  styleUrls:   ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit {
  
  private messages$: Observable<MessageModel[][]>;
  
  private messagePath = 'messages';
  
  constructor(db: AngularFirestore) {
    
    // @ts-ignore
    this.messages$ = db.collection(this.messagePath).valueChanges()
      .pipe(switchMap(x => of(x)
          .pipe(concatMap(y => y),
            bufferCount(3),
            bufferCount(Number.MAX_VALUE),
            tap(z => {console.warn(z); })
          )
        )
      )
    ;
  
    // db.collection(this.messagePath)
    
    // db.collection(this.messagePath)
    //   .add(message);
    
  }
  
  ngOnInit() {
  }
  
}
