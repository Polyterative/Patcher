import {
  ChangeDetectionStrategy,
  Component
}                     from '@angular/core';
import {
  Emittable,
  Emitter
}                     from '@ngxs-labs/emitter';
import {
  Select,
  Store
}                     from '@ngxs/store';
import { Observable } from 'rxjs';
import {
  CounterState,
  CounterStateModel
}                     from 'src/app/store/counter.state';

@Component({
  selector:        'app-root',
  templateUrl:     './app.component.html',
  styleUrls:       ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  
  @Select(CounterState)
  public count$: Observable<CounterStateModel>;
  
  @Emitter(CounterState.setValue)
  public counterValue: Emittable<number>;
  
  constructor(public store: Store) {
  
  }
  
}
