import { buildMarketplaceLatestOfferSummary } from './marketplace-transaction.utils';

describe('buildMarketplaceLatestOfferSummary — edge probing', () => {
  const build = (input: Record<string, unknown>) => buildMarketplaceLatestOfferSummary(input as never);

  it('tolerates null, undefined and non-object input', () => {
    for (const input of [null, undefined, 5, 'x', []]) {
      expect(buildMarketplaceLatestOfferSummary(input as never))
        .withContext(String(input)).toEqual({available: false, reason: 'inactive_status'});
    }
  });

  it('treats unknown statuses as inactive', () => {
    expect(build({status: 'bogus', proposedPrice: 5, proposedPriceCurrency: 'EUR'}))
      .toEqual({available: false, reason: 'inactive_status'});
    expect(build({status: '', proposedPrice: 5, proposedPriceCurrency: 'EUR'}))
      .toEqual({available: false, reason: 'inactive_status'});
  });

  it('every inactive status hides the offer even when prices exist', () => {
    for (const status of ['cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_mutual', 'disputed']) {
      expect(build({status, agreedPriceAmountMinor: 100, agreedPriceCurrency: 'EUR'}))
        .withContext(status).toEqual({available: false, reason: 'inactive_status'});
    }
  });

  it('ignores stale offer fields for statuses that carry no price (e.g. a non-agreed field on accepted)', () => {
    expect(build({status: 'accepted', proposedPrice: 5, proposedPriceCurrency: 'EUR'}))
      .toEqual({available: false, reason: 'missing_price'});
    expect(build({status: 'paid', counterPrice: 5, counterPriceCurrency: 'EUR'}))
      .toEqual({available: false, reason: 'missing_price'});
  });

  it('uses agreed price in every post-acceptance status and never exposes a responder', () => {
    for (const status of ['accepted', 'paid', 'shipped', 'received', 'closed']) {
      const summary = build({
        status,
        agreedPriceAmountMinor: 12_345,
        agreedPriceCurrency: 'eur',
        currentActorRole: 'buyer'
      });
      expect(summary).withContext(status).toEqual(jasmine.objectContaining({
        available: true,
        amountMinor: 12_345,
        currency: 'EUR',
        source: 'agreed_price',
        label: 'Agreed price',
        canCurrentActorRespond: false
      }));
      expect((summary as { awaitingActorRole?: string }).awaitingActorRole).toBeUndefined();
    }
  });

  describe('who may respond', () => {
    const base = {status: 'proposed', proposedPrice: '10', proposedPriceCurrency: 'EUR'};

    it('buyer proposal awaits the seller; only the seller may respond', () => {
      expect(build({...base, latestActorRole: 'buyer', currentActorRole: 'seller'}))
        .toEqual(jasmine.objectContaining({awaitingActorRole: 'seller', canCurrentActorRespond: true}));
      expect(build({...base, latestActorRole: 'buyer', currentActorRole: 'buyer'}))
        .toEqual(jasmine.objectContaining({awaitingActorRole: 'seller', canCurrentActorRespond: false}));
    });

    it('an admin or anonymous viewer can never respond', () => {
      for (const currentActorRole of ['admin', undefined, null, '', 'root']) {
        expect(build({...base, currentActorRole}))
          .withContext(String(currentActorRole))
          .toEqual(jasmine.objectContaining({canCurrentActorRespond: false}));
      }
    });

    it('a seller counter awaits the buyer', () => {
      const summary = build({
        status: 'negotiating',
        proposedPrice: '10', proposedPriceCurrency: 'EUR',
        counterPrice: '12', counterPriceCurrency: 'EUR',
        currentActorRole: 'buyer'
      });
      expect(summary).toEqual(jasmine.objectContaining({
        source: 'counter_price',
        amountMinor: 1200,
        awaitingActorRole: 'buyer',
        canCurrentActorRespond: true,
        label: 'Seller counter offer'
      }));
    });

    it('falls back to source defaults when latestActorRole is junk', () => {
      for (const latestActorRole of ['admin', 'root', '', null, undefined, 7]) {
        const summary = build({...base, latestActorRole});
        expect(summary).withContext(String(latestActorRole))
          .toEqual(jasmine.objectContaining({awaitingActorRole: 'seller', label: 'Buyer offer'}));
      }
    });
  });

  describe('amount handling', () => {
    it('prefers amountMinor over a conflicting display price', () => {
      const summary = build({
        status: 'proposed',
        proposedPriceAmountMinor: 500,
        proposedPrice: '999',
        proposedPriceCurrency: 'EUR'
      });
      expect(summary).toEqual(jasmine.objectContaining({amountMinor: 500}));
    });

    it('accepts a zero offer as valid', () => {
      expect(build({status: 'proposed', proposedPriceAmountMinor: 0, proposedPriceCurrency: 'EUR'}))
        .toEqual(jasmine.objectContaining({available: true, amountMinor: 0}));
    });

    it('rejects negative, fractional and non-finite minor amounts', () => {
      for (const amount of [-1, 0.5, NaN, Infinity, -Infinity]) {
        expect(build({status: 'proposed', proposedPriceAmountMinor: amount, proposedPriceCurrency: 'EUR'}))
          .withContext(String(amount)).toEqual({available: false, reason: 'invalid_price'});
      }
    });

    it('reports invalid_price when currency is missing or malformed', () => {
      for (const currency of [undefined, null, '', 'EU', 'EURO', '12$']) {
        expect(build({status: 'proposed', proposedPriceAmountMinor: 100, proposedPriceCurrency: currency}))
          .withContext(String(currency)).toEqual({available: false, reason: 'invalid_price'});
      }
    });

    it('a currency without any amount is invalid, not missing', () => {
      expect(build({status: 'proposed', proposedPriceCurrency: 'EUR'}))
        .toEqual({available: false, reason: 'invalid_price'});
    });

    it('missing everything is missing_price, blank strings count as missing', () => {
      expect(build({status: 'proposed'})).toEqual({available: false, reason: 'missing_price'});
      expect(build({status: 'proposed', proposedPrice: '  ', proposedPriceCurrency: ' '}))
        .toEqual({available: false, reason: 'missing_price'});
    });

    it('an invalid counter does not silently fall back to the original proposal', () => {
      const summary = build({
        status: 'negotiating',
        counterPrice: 'garbage', counterPriceCurrency: 'EUR',
        proposedPrice: '10', proposedPriceCurrency: 'EUR'
      });
      expect(summary).toEqual({available: false, reason: 'invalid_price'});
    });

    it('parses a display price using the currency fraction digits', () => {
      expect(build({status: 'proposed', proposedPrice: '1500', proposedPriceCurrency: 'jpy'}))
        .toEqual(jasmine.objectContaining({amountMinor: 1500, currency: 'JPY'}));
      expect(build({status: 'proposed', proposedPrice: '15.50', proposedPriceCurrency: 'JPY'}))
        .toEqual({available: false, reason: 'invalid_price'});
    });
  });
});
