import { Component }    from '@angular/core';
import {
  Emittable,
  Emitter
}                       from '@ngxs-labs/emitter';
import {
  Select,
  Store
}                       from '@ngxs/store';
import { Observable }   from 'rxjs';
import { CounterState } from 'src/app/store/counter.state';

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.scss']
})
export class AppComponent {
  title = 'Focus';
  
  @Select(CounterState)
  counter$: Observable<number>;
  
  // Use in components to emit asynchronously payload
  @Emitter(CounterState.increment)
  increment: Emittable<void>;
  
  @Emitter(CounterState.decrement)
  decrement: Emittable<void>;
  
  constructor(public store: Store) {
  
  }
  
}
