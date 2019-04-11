import { NgZone }      from '@angular/core';
import { Router }      from '@angular/router';
import {
  EmitterAction,
  Receiver
}                      from '@ngxs-labs/emitter';
import {
  State,
  StateContext
}                      from '@ngxs/store';
import { Observable }  from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { filter }      from 'rxjs/internal/operators/filter';
import {
  share,
  take
}                      from 'rxjs/operators';

@State<string>({
  name:     'Router',
  defaults: 'YET_TO_ROUTE'
})
export class RouterState {
  
  private static router: Router;
  private static ngZone: NgZone;
  
  constructor(injectedRouter: Router, injectedNgZone: NgZone) {
    RouterState.router = injectedRouter;
    RouterState.ngZone = injectedNgZone;
  }
  
  @Receiver({type: '[Router] Change path'})
  static changeRoute({setState}: StateContext<string>, {payload}: EmitterAction<string>): Observable<boolean> {
    
    const navigate = () => RouterState.router.navigate([payload]);
    
    const observable = fromPromise(
      RouterState.ngZone.run(navigate)    // ngZone workaround https://github.com/angular/angular/issues/25837
    )
      .pipe(
        take(1), // one-shot
        share()
      );
    
    // this way it fires even if emitted doesn't subscribes
    observable.pipe(
      filter(navigated => navigated) // only if actually navigated
    )
      .subscribe(_ => setState(payload));
    
    return observable;
  }
}
