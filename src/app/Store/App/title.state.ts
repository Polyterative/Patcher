import {
  EmitterAction,
  Receiver
}                from '@ngxs-labs/emitter';
import {
  State,
  StateContext
}                from '@ngxs/store';
import { patch } from '@ngxs/store/operators';

export interface TitleStateModel {
  title: string;
}

@State<TitleStateModel>({
  name:     'TitleStateModel',
  defaults: {
    title: 'Default'
  }
})
export class TitleState {
  
  @Receiver()
  static setValue(context: StateContext<TitleStateModel>, action: EmitterAction<TitleStateModel>) {
    context.setState(patch(action.payload));
  }
  
}
