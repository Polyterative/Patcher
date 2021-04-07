import { HttpClient }       from '@angular/common/http';
import { Injectable }       from '@angular/core';
import { Router }           from '@angular/router';
import {
    ReplaySubject,
    Subject
}                           from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map
}                           from 'rxjs/operators';
import { AuthorizeService } from '../../../../features/admin/api-authorization/authorize.service';
// import UserAPI = User.UserAPI;
// import UserModel = User.UserModel;

interface UserModel {
  username: string;
}

@Injectable()
export class UserDataHandlerService {
  logoff$ = new Subject<void>();
  login$ = new Subject<void>();

  readonly store = {
    user$: new ReplaySubject<UserModel>()
  };

  constructor(
    public router: Router,
    public httpClient: HttpClient,
    public authorize: AuthorizeService
  ) {

    authorize.getUser()
             .pipe(distinctUntilChanged())
             .subscribe(value => this.store.user$.next({username: value?.name || ''}));
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

    this.logoff$
        .pipe(map(x => undefined))
        .subscribe(value => {
          this.authorize.signOut(null);

          this.store.user$.next(value);
        });

    this.login$
        .pipe()
        .subscribe(x => {
          router.navigate(
            [ //todo fixme
              'authentication/login'
              // 'Account',
              // 'Login'
            ]
          );
        });

  }

}
