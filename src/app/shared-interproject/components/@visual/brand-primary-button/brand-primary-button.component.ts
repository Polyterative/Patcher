import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'app-brand-primary-button',
  templateUrl:     './brand-primary-button.component.html',
  styleUrls:       ['./brand-primary-button.component.scss'],
  encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandPrimaryButtonComponent {
  @Input() disabled = false;
  @Input() error = false;
  @Input() theme: 'primary' | 'warning' | 'positive' | 'negative' | 'light' = 'primary';
  @Output() readonly click$ = new EventEmitter<void>();
  @Input() innerFlex: string = undefined;
  @Input() routerLink: string | any[] = undefined;
  
  doNothing() {
    // do not delete this
  }
}
