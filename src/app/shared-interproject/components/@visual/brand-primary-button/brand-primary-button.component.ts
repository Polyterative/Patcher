import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'app-brand-primary-button',
  templateUrl:     './brand-primary-button.component.html',
  styleUrls:       ['./brand-primary-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandPrimaryButtonComponent {
  @Input() disabled: boolean = false;
  @Input() error: boolean = false;
  @Input() theme: 'primary' | 'warning' | 'positive' | 'negative'| 'light' = 'primary';
  @Output() click$ = new EventEmitter<void>();
  @Input() innerFlex: string = undefined;

  doNothing() {
    //do not delete this
  }
}
