import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  State,
  StateContext
} from '@ngxs/store';

export interface CounterStateModel {
  value: number;
}

@State<CounterStateModel>({
  name:     'counter',
  defaults: {value: 0}
})
export class CounterState {
  
  @Receiver()
  public static setValue(ctx: StateContext<CounterStateModel>, action: EmitterAction<number>) {
    ctx.setState({value: action.payload});
  }
  
}
