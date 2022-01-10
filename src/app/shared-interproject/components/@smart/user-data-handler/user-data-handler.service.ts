import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router }     from '@angular/router';
import {
  ReplaySubject,
  Subject
}                     from 'rxjs';

interface UserModel {
  username: string | undefined;
}

@Injectable()
export class UserDataHandlerService {
  logoffButtonClick$ = new Subject<void>();
  loginButtonClick$ = new Subject<void>();
  signupButtonClick$ = new Subject<void>();
  
  readonly store = {
    user$: new ReplaySubject<UserModel>()
  };
  
  constructor(
    public router: Router,
    public httpClient: HttpClient
  ) {
    
    // let api = new UserAPI(httpClient);
  
    // api.get()
    //    .pipe(
    //      // map(value => value)
    //      // catchError(err => undefined),
    //      catchError(err => ''),
    //      filter(x => !!x)
    //    )
    //    .subscribe(this.store.user$);
  
    // this.store.user$.pipe(filter(x => !!x))
    //     .subscribe(x => console.log(`Got User: ${ x.username }`));
  
    // this.logoffButtonClick$
    //     .pipe(map(x => undefined))
    //     .subscribe(value => {
    //       this.store.user$.next(value);
    //     });
  
    this.loginButtonClick$
        .pipe()
        .subscribe(x => {
          router.navigate(
            [
              '/auth',
              'login'
              // 'Account',
              // 'Login'
            ]
          );
        });
  
    this.signupButtonClick$
        .pipe()
        .subscribe(x => {
          router.navigate(
            [
              '/auth',
              'signup'
              // 'Account',
              // 'Login'
            ]
          );
        });
  
  }
  
}
