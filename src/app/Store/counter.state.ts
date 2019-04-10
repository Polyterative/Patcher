import { Receiver } from '@ngxs-labs/emitter';
import {
  State,
  StateContext
}                   from '@ngxs/store';

@State<number>({
  name:     'counter',
  defaults: 0
})

export class CounterState {
  @Receiver()
  static increment({setState, getState}: StateContext<number>) {
    let state = getState();
    setState(state + 1);
  }
  
  @Receiver()
  static decrement({setState, getState}: StateContext<number>) {
    let state = getState();
    setState(state - 1);
  }
}
