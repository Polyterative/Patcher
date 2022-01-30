import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation
}                                 from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import {
  BehaviorSubject,
  merge,
  Observable,
  Subject
}                                 from 'rxjs';
import {
  filter,
  mapTo,
  skip,
  takeUntil
}                                 from 'rxjs/operators';

@Component({
  selector:        'lib-auto-content-loading-indicator',
  templateUrl:     './auto-content-loading-indicator.component.html',
  styleUrls:       ['./auto-content-loading-indicator.component.scss'],
  animations:      [
    fadeInOnEnterAnimation(
      {
        anchor:   'enter',
        duration: 500
      }
    )
  ],
  encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutoContentLoadingIndicatorComponent implements OnInit, OnDestroy {
  @Input() data$: Observable<any>;
  @Input() updateData$: Observable<any>;
  dataLoading$ = new BehaviorSubject<boolean>(true);
  
  @Input() loadingLines = 1;
  @Input() skipFirstData = false;
  @Input() loadingLabel = 'Loading';
  protected destroyEvent$ = new Subject<void>();
  
  ngOnInit(): void {
  
    if (this.data$ && this.updateData$) {
      merge(
        this.updateData$.pipe(takeUntil(this.destroyEvent$), mapTo(true)),
        this.data$.pipe(takeUntil(this.destroyEvent$), skip(this.skipFirstData ? 1 : 0), filter(data => !!data), mapTo(false))
      )
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => this.dataLoading$.next(x));
    }
  
  }
  
  ngOnDestroy(): void {
    
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
