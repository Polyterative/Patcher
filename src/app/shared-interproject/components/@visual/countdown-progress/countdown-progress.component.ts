import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output
} from '@angular/core';


/**
 * Reusable countdown progress bar component
 * Displays a countdown timer with a progress bar
 */
@Component({
  selector: 'lib-countdown-progress',
  templateUrl: './countdown-progress.component.html',
  styleUrls: ['./countdown-progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CountdownProgressComponent implements OnDestroy {
  /**
   * Current countdown value in seconds
   */
  @Input() countdown: number | null = null;
  
  /**
   * Progress percentage (0-100)
   */
  @Input() progress: number = 0;
  
  /**
   * Message to display before the countdown number
   */
  @Input() message: string = 'Redirecting in';
  
  /**
   * Unit label (e.g., "seconds", "second")
   */
  @Input() unitLabel: string = 'seconds';
  
  /**
   * Optional action button label
   */
  @Input() actionButtonLabel?: string;
  
  /**
   * Theme for the progress bar
   * - 'success' (green) for successful operations
   * - 'info' (blue) for informational countdowns
   * - 'warning' (orange) for warning countdowns
   */
  @Input() theme: 'success' | 'info' | 'warning' = 'success';
  
  /**
   * Emits when the action button is clicked
   */
  @Output() readonly actionClick$ = new EventEmitter<void>();
  
  ngOnDestroy(): void {
    // Cleanup if needed
  }
  
  onActionClick(): void {
    this.actionClick$.next();
  }
}