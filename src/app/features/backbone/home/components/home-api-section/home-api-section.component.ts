import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HomeApiFact, HomeCtaClick } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-api-section',
  templateUrl: './home-api-section.component.html',
  styleUrls: ['./home-api-section.component.scss'],
  standalone: true,
  imports: [BrandPrimaryButtonComponent, MatIconModule]
})
export class HomeApiSectionComponent {
  @Input({required: true}) facts: HomeApiFact[] = [];
  @Input({required: true}) docsUrl = '';
  @Input() isSignedIn = false;
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
}
