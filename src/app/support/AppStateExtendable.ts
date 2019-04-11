import {
  Emittable,
  Emitter
}                     from '@ngxs-labs/emitter';
import { Select }     from '@ngxs/store';
import { Observable } from 'rxjs';
import {
  AppState,
  PageStatusCases
}                     from 'src/app/store/app.state';

export class AppStateExtendable {
  
  // @Select(TitleState)
  // title$: Observable<TitleStateModel>;
  //
  @Select(AppState.pageTitle)
  pageTitle$: Observable<string>;
  
  @Emitter(AppState.setPageStatus)
  setTitle$: Emittable<PageStatusCases>;
  
  // @Emitter(PageLoadingState.setValue)
  // setPageLoading$: Emittable<PageLoadingStateModel>;
  
}
