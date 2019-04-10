import {
  EmitterAction,
  Receiver
}                from '@ngxs-labs/emitter';
import {
  State,
  StateContext
}                from '@ngxs/store';
import { patch } from '@ngxs/store/operators';

export interface PageLoadingStateModel {
  loading: boolean;
}

@State<PageLoadingStateModel>({
  name:     'PageLoadingStateModel',
  defaults: {
    loading: false
  }
})
export class PageLoadingState {
  
  @Receiver()
  static setValue(context: StateContext<PageLoadingStateModel>, action: EmitterAction<PageLoadingStateModel>) {
    context.setState(patch(action.payload));
  }
  
}
