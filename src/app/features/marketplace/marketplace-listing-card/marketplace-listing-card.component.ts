import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketplaceListingCardViewModel } from 'src/app/features/marketplace/marketplace-view-models';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';

@Component({
  selector: 'app-marketplace-listing-card',
  standalone: true,
  imports: [
    CommonModule,
    ModulePartsModule,
    RouterLink
  ],
  templateUrl: './marketplace-listing-card.component.html',
  styleUrl: './marketplace-listing-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceListingCardComponent {
  @Input({required: true}) listing!: MarketplaceListingCardViewModel;
}
