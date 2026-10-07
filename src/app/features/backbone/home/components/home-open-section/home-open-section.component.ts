import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HomeCtaClick, HomeOpenPillar } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-open-section',
  templateUrl: './home-open-section.component.html',
  styleUrls: ['./home-open-section.component.scss'],
  standalone: true,
  imports: [BrandPrimaryButtonComponent, MatIconModule]
})
export class HomeOpenSectionComponent {
  @Input({required: true}) pillars: HomeOpenPillar[] = [];
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();

  ctaKey(pillar: HomeOpenPillar): string {
    return `open_${pillar.title.toLowerCase().replace(/[^a-z]+/g, '_')}`;
  }
}
