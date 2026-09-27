import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarketplaceTrustBandSummary } from 'src/app/features/marketplace/marketplace-feedback.utils';

const TRUST_BAND_ICONS: Record<MarketplaceTrustBandSummary['band'], string> = {
  limited_history: 'history',
  mixed: 'rate_review',
  new_seller: 'fiber_new',
  steady: 'verified'
};

@Component({
  selector: 'app-marketplace-trust-chip',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './marketplace-trust-chip.component.html',
  styleUrl: './marketplace-trust-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceTrustChipComponent {
  @Input() summary: MarketplaceTrustBandSummary | null = null;

  iconFor(band: MarketplaceTrustBandSummary['band']): string {
    return TRUST_BAND_ICONS[band];
  }
}
