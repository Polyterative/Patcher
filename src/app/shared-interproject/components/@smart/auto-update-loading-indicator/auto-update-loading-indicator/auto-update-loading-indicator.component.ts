import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { LottieContainerModule } from '../../lottie-container/lottie-container.module';
import {
  asapScheduler,
  BehaviorSubject,
  merge,
  Observable,
  Subject
} from 'rxjs';
import {
  mapTo,
  observeOn,
  skip,
  takeUntil
} from 'rxjs/operators';


@Component({
  selector: 'lib-auto-update-loading-indicator',
  templateUrl: './auto-update-loading-indicator.component.html',
  styleUrls: ['./auto-update-loading-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LottieContainerModule
  ]
})
export class AutoUpdateLoadingIndicatorComponent implements OnInit, OnDestroy {
  @Input() data$: Observable<unknown>;
  @Input() updateData$: Observable<unknown>;
  readonly dataLoading$ = new BehaviorSubject<boolean>(true);
  
  @Input() initialLoading = true;
  @Input() loadingLines = 1;
  @Input() skipFirstData = false;
  @Input() loadingLabel = 'Updating results';
  protected destroyEvent$ = new Subject<void>();
  
  ngOnInit(): void {
    this.dataLoading$.next(this.initialLoading);
    if (this.data$ && this.updateData$) {
      merge(
        this.updateData$.pipe(takeUntil(this.destroyEvent$), mapTo(true)),
        this.data$.pipe(observeOn(asapScheduler), takeUntil(this.destroyEvent$), skip(this.skipFirstData ? 1 : 0), mapTo(false))
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
