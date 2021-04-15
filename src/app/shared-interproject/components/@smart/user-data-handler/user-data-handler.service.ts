import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router }     from '@angular/router';
import {
  ReplaySubject,
  Subject
}                     from 'rxjs';
import {
  filter,
  map
}                     from 'rxjs/operators';

interface UserModel {
  username: string | undefined;
}

@Injectable()
export class UserDataHandlerService {
  logoffButtonClick$ = new Subject<void>();
  loginButtonClick$ = new Subject<void>();
  
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
    
    this.store.user$.pipe(filter(x => !!x))
        .subscribe(x => console.log(`Got User: ${ x.username }`));
    
    this.logoffButtonClick$
        .pipe(map(x => undefined))
        .subscribe(value => {
  
          this.store.user$.next(value);
        });
    
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
    
  }
  
}
