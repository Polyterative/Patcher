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
import { of }                 from 'rxjs/internal/observable/of';
import { delay }              from 'rxjs/operators';
import { PageStatusCases }    from 'src/app/store/app.state';
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
  
    of(4).pipe(delay(3000)).subscribe(_ => {
    
      console.log('a');
    
      this.setTitle$.emit(PageStatusCases.IDLE);
    });
    
    
  }
  
}
