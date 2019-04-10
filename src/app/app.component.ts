import {
  ChangeDetectionStrategy,
  Component
}                             from '@angular/core';
import {
  Emittable,
  Emitter
}                             from '@ngxs-labs/emitter';
import {
  Select,
  Store
}                             from '@ngxs/store';
import { Observable }         from 'rxjs';
import {
  CounterState,
  CounterStateModel
}                             from 'src/app/store/counter.state';
import { AppStateExtendable } from 'src/app/support/AppStateExtendable';

@Component({
  selector:        'app-root',
  templateUrl:     './app.component.html',
  styleUrls:       ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent extends AppStateExtendable {
  
  @Select(CounterState)
  count$: Observable<CounterStateModel>;
  
  @Emitter(CounterState.setValue)
  counterValue: Emittable<number>;
  
  constructor(public store: Store) {
    super();
  
    // of(4).pipe(debounceTime(2000)).subscribe(_ => {
    //   this.setTitle$.emit("changed");
    // });
  }
  
}
