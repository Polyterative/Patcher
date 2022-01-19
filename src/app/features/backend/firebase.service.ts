import { Injectable }       from '@angular/core';
import { AngularFireAuth }  from '@angular/fire/compat/auth/angular-fire-compat-auth';
import { AngularFirestore } from '@angular/fire/compat/firestore/angular-fire-compat-firestore';

@Injectable()
export class FirebaseService {
  
  // user: { logout$: EventEmitter<void>; login$: EventEmitter<void>; user$: ReplaySubject<UserCredential | User> } = {
  //     user$:   new ReplaySubject(),
  //     login$:  new EventEmitter<void>(),
  //     logout$: new EventEmitter<void>()
  // };
  
  constructor(
    private fireStore: AngularFirestore,
    private fireAuth: AngularFireAuth
  ) {
    
    // external outlet
    // this.user.login$.subscribe(x => {
    //     this.firebaseLogin();
    // });
    
    // external outlet
    // this.user.logout$
    //     .subscribe(x => {
    //         this.user.user$.next(undefined);
    //
    //         this.firebaseLogout();
    //     });
    
    // login
    // fireAuth.user
    //     .pipe(
    //         filter(x => x && x.emailVerified && !!x.displayName)
    //     )
    //     .subscribe(x => {
    //         this.user$.next(x);
    //     });
    //
    // this.user$.subscribe(x => {
    //     console.warn(x);
    // });
  }
  
  // private firebaseLogin() {
  // const persistence$ = fromPromise(this.fireAuth.auth.setPersistence(AuthPersistence.LOCAL))
  // .pipe(take(1));
  // const auth$ = fromPromise(this.fireAuth.auth.signInWithPopup(new GoogleAuthProvider()));
  //
  // concat(
  //   persistence$.pipe(map(() => undefined)),
  //   auth$
  // )
  // .pipe(
  //   // filter(x => !!x),
  //   // tap(x => console.log(x))
  // )
  // .subscribe(this.user.user$);
  // }
  
  // private firebaseLogout() {
  //     return fromPromise(this.fireAuth.auth.signOut());
  // }
}
