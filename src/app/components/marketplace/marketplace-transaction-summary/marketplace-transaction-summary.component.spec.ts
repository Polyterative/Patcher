import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import type { MarketplaceInquiryDraft } from 'src/app/features/marketplace/marketplace-transaction.models';
import { MarketplaceTransactionSummaryComponent } from './marketplace-transaction-summary.component';

describe('MarketplaceTransactionSummaryComponent', () => {
  let fixture: ComponentFixture<MarketplaceTransactionSummaryComponent>;
  let originalMarketplaceEnabled: boolean;

  beforeEach(() => {
    originalMarketplaceEnabled = environment.features.marketplaceEnabled;
    environment.features.marketplaceEnabled = true;
    TestBed.configureTestingModule({
      imports: [MarketplaceTransactionSummaryComponent]
    });
    fixture = TestBed.createComponent(MarketplaceTransactionSummaryComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    environment.features.marketplaceEnabled = originalMarketplaceEnabled;
  });

  it('stays hidden when the Marketplace feature flag is off', () => {
    environment.features.marketplaceEnabled = false;
    fixture = TestBed.createComponent(MarketplaceTransactionSummaryComponent);
    fixture.componentRef.setInput('timelineEvents', [{toStatus: 'accepted'}]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="marketplace-transaction-summary"]')).toBeNull();
  });

  it('renders a normalized inquiry draft without exposing unrecognized fields', () => {
    fixture.componentRef.setInput('inquiryDraft', {
      buyerProfileId: 'buyer-1',
      listingId: 'listing-1',
      message: '  Is this still available?  ',
      proposedPrice: '12.50',
      proposedPriceCurrency: 'EUR',
      buyerDestinationSummary: 'Berlin, DE',
      buyerShippingAddressSnapshot: {street: 'Private street 1'}
    } as MarketplaceInquiryDraft & Record<string, unknown>);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Draft is valid');
    expect(text).toContain('Is this still available?');
    expect(text).toContain('Berlin, DE');
    expect(text).not.toContain('Private street 1');
  });

  it('renders safe timeline and offer descriptors and omits private event notes', () => {
    fixture.componentRef.setInput('timelineEvents', [
      {fromStatus: 'proposed', toStatus: 'accepted', actorRole: 'seller', createdAt: '2026-08-01T12:00:00Z', note: 'private shipping data'},
      {toStatus: null}
    ]);
    fixture.componentRef.setInput('latestOffer', {
      status: 'negotiating',
      proposedPriceAmountMinor: 1234,
      proposedPriceCurrency: 'USD',
      latestActorRole: 'buyer',
      currentActorRole: 'seller'
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Offer accepted');
    expect(text).toContain('Status update unavailable');
    expect(text).toContain('Buyer offer');
    expect(text).toContain('$12.34');
    expect(text).toContain('Waiting for your response');
    expect(text).not.toContain('private shipping data');
  });

  it('renders a redacted thread preview, unread count, and plain-language review flags', () => {
    fixture.componentRef.setInput('threadPreview', {
      transactionId: 'transaction-1',
      otherParticipantLabel: 'Seller',
      lastMessageBody: 'Email me at seller@example.com',
      lastMessageKind: 'text',
      unreadCount: 3
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Seller');
    expect(text).toContain('[redacted contact]');
    expect(text).toContain('3 unread');
    expect(text).toContain('External contact details');
    expect(text).not.toContain('seller@example.com');
  });

  it('keeps feedback hidden until the helper visibility window permits release', () => {
    fixture.componentRef.setInput('feedbackDisplay', {
      closedAt: '2026-06-25T12:00:00Z',
      now: '2026-07-01T12:00:00Z',
      completedTransactions: 5,
      feedback: [{sentiment: 'positive'}, {sentiment: 'negative'}]
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="marketplace-feedback-summary"]')).toBeNull();

    fixture.componentRef.setInput('feedbackDisplay', {
      closedAt: '2026-05-01T12:00:00Z',
      now: '2026-07-01T12:00:00Z',
      completedTransactions: 5,
      feedback: [{sentiment: 'positive'}, {sentiment: 'negative'}]
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Marketplace feedback');
    expect(text).toContain('Mixed feedback');
    expect(text).toContain('1 positive · 0 neutral · 1 negative');
  });

  it('renders the summary shell without subsections when every input is null', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="marketplace-transaction-summary"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="marketplace-inquiry-preview"]')).toBeNull();
    expect(host.querySelector('[data-testid="marketplace-transaction-timeline"]')).toBeNull();
    expect(host.querySelector('[data-testid="marketplace-latest-offer"]')).toBeNull();
    expect(host.querySelector('[data-testid="marketplace-thread-preview"]')).toBeNull();
    expect(host.querySelector('[data-testid="marketplace-feedback-summary"]')).toBeNull();

    const component = fixture.componentInstance;
    expect(component.inquiryResult).toBeNull();
    expect(component.timelineItems).toEqual([]);
    expect(component.latestOfferSummary).toBeNull();
    expect(component.formattedLatestOffer).toBeNull();
    expect(component.threadSummary).toBeNull();
    expect(component.visibleFeedbackSummary).toBeNull();
  });

  it('renders an invalid inquiry draft with attention copy and no normalized message', () => {
    fixture.componentRef.setInput('inquiryDraft', {
      buyerProfileId: '',
      listingId: '',
      message: '   '
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Draft needs attention');
    expect(fixture.componentInstance.inquiryResult?.valid).toBeFalse();
    expect(fixture.componentInstance.inquiryErrors({message: '', listingId: 'Listing required'}))
      .toEqual(['Listing required']);
  });

  it('labels unavailable offers and unknown message flags with plain-language fallbacks', () => {
    const component = fixture.componentInstance;

    expect(component.offerUnavailableLabel('inactive_status'))
      .toBe('This transaction is no longer accepting offers.');
    expect(component.offerUnavailableLabel('invalid_price'))
      .toBe('The latest offer details are unavailable.');
    expect(component.offerUnavailableLabel('missing_price'))
      .toBe('No offer has been recorded yet.');
    expect(component.messageFlagLabel('unknown_flag')).toBe('Review this message');
    expect(component.messageFlagLabel('repeated_urls')).toBe('Several links');
  });

  it('renders unavailable offer and thread states without leaking raw payloads', () => {
    fixture.componentRef.setInput('timelineEvents', []);
    fixture.componentRef.setInput('latestOffer', {status: 'expired'} as never);
    fixture.componentRef.setInput('threadPreview', {transactionId: '   '} as never);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.nativeElement.querySelector('[data-testid="marketplace-transaction-timeline"]')).toBeNull();
    expect(text).toContain('Latest offer');
    expect(text).toContain('Conversation preview unavailable');
  });
});
