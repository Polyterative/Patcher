import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';

@Component({
  selector:        'app-root',
  templateUrl:     './app.component.html',
  styleUrls:       ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  
  // @Select(CounterState)
  // count$: Observable<CounterStateModel>;
  //
  // @Emitter(CounterState.setValue)
  // counterValue: Emittable<number>;
  
  constructor() {
  
  }
  
}
