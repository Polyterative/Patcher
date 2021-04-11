import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnDestroy,
    OnInit
} from '@angular/core';
import {
    BehaviorSubject,
    merge,
    Observable,
    Subject
} from 'rxjs';
import {
    filter,
    map,
    takeUntil
} from 'rxjs/operators';

@Component({
    selector:        'app-auto-loading-indicator',
    templateUrl:     './auto-loading-indicator.component.html',
    styleUrls:       ['./auto-loading-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutoLoadingIndicatorComponent implements OnInit, OnDestroy {
    @Input() data$: Observable<any>;
    @Input() updateData$: Subject<void>;
    dataLoading$ = new BehaviorSubject<boolean>(false);
    
    protected destroyEvent$ = new Subject();
    
    ngOnInit(): void {
    
        merge(
          this.updateData$.pipe(map(data => true)),
          this.data$.pipe(filter(data => !!data), map(data => false))
        )
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => this.dataLoading$.next(x));
        // .subscribe(x => console.log(x));
    }
    
    ngOnDestroy(): void {
        this.destroyEvent$.next();
        this.destroyEvent$.complete();
        
    }
}