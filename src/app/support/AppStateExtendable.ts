import {
  Emittable,
  Emitter
}                     from '@ngxs-labs/emitter';
import { Select }     from '@ngxs/store';
import { Observable } from 'rxjs';
import {
  PageLoadingState,
  PageLoadingStateModel
}                     from 'src/app/store/App/pageLoading.state';
import {
  TitleState,
  TitleStateModel
}                     from 'src/app/store/App/title.state';

export class AppStateExtendable {
  
  @Select(TitleState)
  title$: Observable<TitleStateModel>;
  
  @Select(PageLoadingState)
  pageLoading$: Observable<PageLoadingStateModel>;
  
  @Emitter(TitleState.setValue)
  setTitle$: Emittable<TitleStateModel>;
  
  @Emitter(PageLoadingState.setValue)
  setPageLoading$: Emittable<PageLoadingStateModel>;
  
}
