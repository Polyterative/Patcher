import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HomeCtaClick } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-closing-cta',
  templateUrl: './home-closing-cta.component.html',
  styleUrls: ['./home-closing-cta.component.scss'],
  standalone: true,
  imports: [BrandPrimaryButtonComponent]
})
export class HomeClosingCtaComponent {
  @Input() isSignedIn = false;
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
}
