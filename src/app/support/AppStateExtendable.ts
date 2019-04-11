import {
  Emittable,
  Emitter
} from '@ngxs-labs/emitter';
import {
  AppState,
  PageStatusCases
} from 'src/app/store/app.state';

export class AppStateExtendable {
  
  // @Select(TitleState)
  // title$: Observable<TitleStateModel>;
  //
  // @Select(PageLoadingState)
  // pageLoading$: Observable<PageLoadingStateModel>;
  
  @Emitter(AppState.setPageStatus)
  setTitle$: Emittable<PageStatusCases>;
  
  // @Emitter(PageLoadingState.setValue)
  // setPageLoading$: Emittable<PageLoadingStateModel>;
  
}
