import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';

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
    public router: Router
  ) {
    this.loginButtonClick$
        .subscribe(x => {
          router.navigate(['/auth', 'login']);
        });
  
    this.signupButtonClick$
        .subscribe(x => {
          router.navigate(['/auth', 'signup']);
        });
  
  }
  
}
