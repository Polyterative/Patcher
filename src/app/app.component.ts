import {
  ChangeDetectionStrategy,
  Component
}                             from '@angular/core';
import { Store }              from '@ngxs/store';
import { of }                 from 'rxjs/internal/observable/of';
import { delay }              from 'rxjs/operators';
import { AppStateExtendable } from 'src/app/support/AppStateExtendable';

@Component({
  selector:        'app-root',
  templateUrl:     './app.component.html',
  styleUrls:       ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent extends AppStateExtendable {
  
  // @Select(CounterState)
  // count$: Observable<CounterStateModel>;
  //
  // @Emitter(CounterState.setValue)
  // counterValue: Emittable<number>;
  
  constructor(public store: Store) {
    super();
  
    of(4)
      .pipe(delay(3000))
      .subscribe(_ => {
      
        console.log('a');
      
        this.setTitle$.emit('IDLE');
      
        this.changeRoute$.emit('todos');
      });
    
  }
  
}
