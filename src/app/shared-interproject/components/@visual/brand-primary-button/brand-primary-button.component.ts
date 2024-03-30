import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';


export type BrandPrimaryButtonTheme =
  'primary'
  | 'warning'
  | 'positive'
  | 'negative'
  | 'light';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'app-brand-primary-button',
  templateUrl: './brand-primary-button.component.html',
  styleUrls: ['./brand-primary-button.component.scss'],
  // encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandPrimaryButtonComponent {
  @Input() disabled = false;
  @Input() error = false;
  @Input() theme: BrandPrimaryButtonTheme = 'primary';
  @Output() readonly click$ = new EventEmitter<void>();
  @Input() innerFlex: string = undefined;
  @Input() routerLink: string | any[] = undefined;
  @Input() autoFocus = false;
  
  doNothing() {
    // do not delete this
  }
}