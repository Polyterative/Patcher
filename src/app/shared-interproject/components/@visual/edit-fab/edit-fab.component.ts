import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import {
  concat,
  Observable,
  of,
  timer
} from 'rxjs';
import {
  delay,
  shareReplay,
  switchMap
} from 'rxjs/operators';


const BOUNCE_DELAY_MS = 3000;
const BOUNCE_INTERVAL_MS = 30000;
const BOUNCE_DURATION_MS = 650;


/**
 * UI ONLY COMPONENT
 * Unified Edit FAB — shows "Edit" or "Done" depending on editMode$.
 * Bounces after BOUNCE_DELAY_MS on every appearance, then every BOUNCE_INTERVAL_MS.
 */
@Component({
  selector: 'app-edit-fab',
  templateUrl: './edit-fab.component.html',
  styleUrls: ['./edit-fab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class EditFabComponent {
  @Input() editMode$: Observable<boolean>;
  @Input() hasPendingChanges$: Observable<boolean> = of(false);
  @Input() openLabel = 'Edit';
  @Input() closeLabel = 'Close editor';
  @Input() discardLabel = 'Discard changes';
  @Input() openIcon = 'edit';
  @Input() closeIcon = 'close';
  @Input() discardIcon = 'warning';
  @Output() readonly toggle$ = new EventEmitter<void>();
  
  /** Emits true for BOUNCE_DURATION_MS, then false, on every timer tick. */
  readonly bouncing$: Observable<boolean> = timer(BOUNCE_DELAY_MS, BOUNCE_INTERVAL_MS).pipe(
    switchMap(() => concat(
      of(true),
      of(false).pipe(delay(BOUNCE_DURATION_MS))
    )),
    shareReplay(1)
  );
}
