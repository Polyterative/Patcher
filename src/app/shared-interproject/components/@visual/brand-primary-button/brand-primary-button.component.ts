import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatTooltipModule,
  TooltipPosition
} from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';


export type BrandPrimaryButtonTheme =
  'primary'
  | 'warning'
  | 'positive'
  | 'negative'
  | 'light'
  | 'solid';

export type BrandPrimaryButtonSize =
  'default'
  | 'large';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'app-brand-primary-button',
  templateUrl: './brand-primary-button.component.html',
  styleUrls: ['./brand-primary-button.component.scss'],
  // encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    NgTemplateOutlet,
    RouterModule,
    A11yModule
  ]
})
export class BrandPrimaryButtonComponent {
  @Input() disabled = false;
  @Input() error = false;
  @Input() theme: BrandPrimaryButtonTheme = 'primary';
  /** `large` is for page-level calls to action (marketing surfaces); it also meets the minimum touch-target height. */
  @Input() size: BrandPrimaryButtonSize = 'default';
  @Output() readonly click$ = new EventEmitter<void>();
  @Input() innerFlex: string = undefined;
  @Input() routerLink: string | readonly unknown[] = undefined;
  @Input() fragment: string | undefined = undefined;
  /** Plain (non-router) link target: external URLs and in-page anchors. Wins over `routerLink`. */
  @Input() href: string | undefined = undefined;
  @Input() target: '_blank' | '_self' | undefined = undefined;
  @Input() autoFocus = false;
  @Input() icon: string | undefined = undefined;
  @Input() tooltip = '';
  @Input() tooltipPosition: TooltipPosition = 'above';
  
  /** External links opened in a new tab never leak the opener. */
  get linkRel(): string | null {
    return this.target === '_blank' ? 'noopener noreferrer' : null;
  }

  doNothing() {
    // do not delete this
  }
}
