import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import {
  BehaviorSubject,
  merge,
  Observable,
  Subject
} from 'rxjs';
import {
  filter,
  mapTo,
  takeUntil
} from 'rxjs/operators';

@Component({
  selector:        'app-auto-loading-indicator',
  templateUrl:     './auto-loading-indicator.component.html',
  styleUrls:       ['./auto-loading-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class AutoLoadingIndicatorComponent implements OnInit, OnDestroy {
  @Input() data$: Observable<any>;
  @Input() updateData$: Observable<any>;
  dataLoading$ = new BehaviorSubject<boolean>(true);
  
  protected destroyEvent$ = new Subject();
  
  ngOnInit(): void {
    merge(
      this.updateData$.pipe(takeUntil(this.destroyEvent$), mapTo(true)),
      this.data$.pipe(takeUntil(this.destroyEvent$), filter(data => !!data), mapTo(false))
    )
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(x => this.dataLoading$.next(x));
  }
  
  ngOnDestroy(): void {
    
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
