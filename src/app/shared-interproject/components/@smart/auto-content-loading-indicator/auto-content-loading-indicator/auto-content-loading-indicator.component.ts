import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  BehaviorSubject,
  merge,
  Observable,
  Subject
} from 'rxjs';
import {
  filter,
  mapTo,
  skip,
  takeUntil
} from 'rxjs/operators';


@Component({
  selector: 'lib-auto-content-loading-indicator',
  templateUrl: './auto-content-loading-indicator.component.html',
  styleUrls: ['./auto-content-loading-indicator.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease', style({ opacity: 1 }))
      ])
    ])
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class AutoContentLoadingIndicatorComponent extends SubManager implements OnInit, OnDestroy {
  @Input() data$: Observable<unknown>;
  @Input() updateData$: Observable<unknown>;
  readonly dataLoading$ = new BehaviorSubject<boolean>(true);
  
  @Input() loadingLines = 1;
  @Input() skipFirstData = false;
  @Input() loadingLabel = 'Loading content';
  
  ngOnInit(): void {
  
    if (this.data$ && this.updateData$) {
      merge(
        this.updateData$.pipe(this.takeUntilDestroyed(), mapTo(true)),
        this.data$.pipe(this.takeUntilDestroyed(), skip(this.skipFirstData ? 1 : 0), filter(data => !!data), mapTo(false))
      )
        .pipe(this.takeUntilDestroyed())
        .subscribe(x => this.dataLoading$.next(x));
    }
  
  }
  
  ngOnDestroy(): void {
    
    super.ngOnDestroy();
    
  }
}
