import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HomeBenefit, HomeCtaClick, HomeSwitchStep } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-switch-section',
  templateUrl: './home-switch-section.component.html',
  styleUrls: ['./home-switch-section.component.scss'],
  standalone: true,
  imports: [BrandPrimaryButtonComponent, MatIconModule]
})
export class HomeSwitchSectionComponent {
  @Input({required: true}) steps: HomeSwitchStep[] = [];
  @Input({required: true}) benefits: HomeBenefit[] = [];
  @Input() isSignedIn = false;
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
}
