import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import {
  aggregateMarketplaceFeedbackSentiments,
  isMarketplaceFeedbackVisible,
  type MarketplaceFeedbackVisibilityInput,
  summarizeMarketplaceTrustBand
} from 'src/app/features/marketplace/marketplace-feedback.utils';
import {
  buildMarketplaceMessageThreadPreview,
  type MarketplaceMessageThreadPreviewCandidate
} from 'src/app/features/marketplace/marketplace-messaging.utils';
import { buildMarketplaceLatestOfferSummary } from 'src/app/features/marketplace/marketplace-transaction-offers.utils';
import { buildMarketplaceTransactionTimeline } from 'src/app/features/marketplace/marketplace-transaction-timeline.utils';
import { validateAndNormalizeMarketplaceInquiryDraft } from 'src/app/features/marketplace/marketplace-transaction-inquiry.utils';
import {
  type MarketplaceInquiryDraft,
  type MarketplaceInquiryDraftField,
  type MarketplaceLatestOfferSummaryInput,
  type MarketplaceLatestOfferUnavailableReason,
  type MarketplaceTransactionTimelineEventInput,
  type MarketplaceTransactionTimelineItem
} from 'src/app/features/marketplace/marketplace-transaction.models';
import { formatMarketplaceMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export interface MarketplaceTransactionFeedbackDisplayInput extends MarketplaceFeedbackVisibilityInput {
  completedTransactions: number;
  feedback: unknown;
}

@Component({
  selector: 'app-marketplace-transaction-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketplace-transaction-summary.component.html',
  styleUrl: './marketplace-transaction-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceTransactionSummaryComponent extends SubManager {
  @Input() inquiryDraft: MarketplaceInquiryDraft | null = null;
  @Input() timelineEvents: readonly MarketplaceTransactionTimelineEventInput[] | null = null;
  @Input() latestOffer: MarketplaceLatestOfferSummaryInput | null = null;
  @Input() threadPreview: MarketplaceMessageThreadPreviewCandidate | null = null;
  @Input() feedbackDisplay: MarketplaceTransactionFeedbackDisplayInput | null = null;

  readonly marketplaceEnabled = environment.features.marketplaceEnabled;

  constructor() {
    super();
  }

  get inquiryResult(): ReturnType<typeof validateAndNormalizeMarketplaceInquiryDraft> | null {
    return this.inquiryDraft
      ? validateAndNormalizeMarketplaceInquiryDraft(this.inquiryDraft)
      : null;
  }

  get timelineItems(): MarketplaceTransactionTimelineItem[] {
    return buildMarketplaceTransactionTimeline(this.timelineEvents);
  }

  get latestOfferSummary() {
    return this.latestOffer
      ? buildMarketplaceLatestOfferSummary(this.latestOffer)
      : null;
  }

  get formattedLatestOffer(): string | null {
    const offer = this.latestOfferSummary;
    return offer?.available
      ? formatMarketplaceMinorUnits(offer.amountMinor, offer.currency, 'en-US')
      : null;
  }

  formatPrice(amountMinor: number, currency: string): string {
    return formatMarketplaceMinorUnits(amountMinor, currency, 'en-US');
  }

  get threadSummary() {
    return this.threadPreview
      ? buildMarketplaceMessageThreadPreview(this.threadPreview)
      : null;
  }

  get visibleFeedbackSummary() {
    const display = this.feedbackDisplay;
    if (!display || !isMarketplaceFeedbackVisible(display)) {
      return null;
    }

    const sentiments = aggregateMarketplaceFeedbackSentiments(display.feedback);
    return {
      sentiments,
      trust: summarizeMarketplaceTrustBand({
        completedTransactions: display.completedTransactions,
        negativeFeedbackCount: sentiments.negative,
        positiveFeedbackCount: sentiments.positive
      })
    };
  }

  messageFlagLabel(flag: string): string {
    switch (flag) {
      case 'repeated_urls':
        return 'Several links';
      case 'off_platform_payment':
        return 'Off-platform payment reference';
      case 'external_contact':
        return 'External contact details';
      default:
        return 'Review this message';
    }
  }

  inquiryErrors(errors: Partial<Record<MarketplaceInquiryDraftField, string>>): string[] {
    return Object.values(errors).filter((error): error is string => !!error);
  }

  offerUnavailableLabel(reason: MarketplaceLatestOfferUnavailableReason): string {
    switch (reason) {
      case 'inactive_status':
        return 'This transaction is no longer accepting offers.';
      case 'invalid_price':
        return 'The latest offer details are unavailable.';
      default:
        return 'No offer has been recorded yet.';
    }
  }
}
