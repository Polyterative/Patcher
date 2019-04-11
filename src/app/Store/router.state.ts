import {
  Injector,
  NgZone
}                      from '@angular/core';
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
  
  constructor(injector: Injector) {
    RouterState.router = injector.get<Router>(Router);
    RouterState.ngZone = injector.get<NgZone>(NgZone);
  }
  
  @Receiver({type: '[Router] Change '})
  static changeRoute({setState}: StateContext<string>, {payload}: EmitterAction<string>): Observable<boolean> {
    
    // ngZone workaround https://github.com/angular/angular/issues/25837
    const observable = fromPromise(RouterState.ngZone.run(() => RouterState.router.navigate([payload])))
      .pipe(
        take(1),
        filter(navigated => navigated), // only if actually navigated
        share()
      );
    
    // this way it fires even if emitted doesn't subscribes
    observable.subscribe(_ => setState(payload));
    
    return observable;
  }
}
