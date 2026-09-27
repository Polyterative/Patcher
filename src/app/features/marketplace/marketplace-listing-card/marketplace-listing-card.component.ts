import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketplaceListingCardViewModel } from 'src/app/features/marketplace/marketplace-view-models';
import { MarketplaceTrustBandSummary } from 'src/app/features/marketplace/marketplace-feedback.utils';
import { MarketplaceTrustChipComponent } from 'src/app/features/marketplace/marketplace-trust-chip/marketplace-trust-chip.component';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';

@Component({
  selector: 'app-marketplace-listing-card',
  standalone: true,
  imports: [
    CommonModule,
    MarketplaceTrustChipComponent,
    ModulePartsModule,
    RouterLink
  ],
  templateUrl: './marketplace-listing-card.component.html',
  styleUrl: './marketplace-listing-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceListingCardComponent {
  @Input({required: true}) listing!: MarketplaceListingCardViewModel;
  @Input() trust: MarketplaceTrustBandSummary | null = null;
}
