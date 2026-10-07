import {
  getMarketplaceTransactionNextActionChips,
  getMarketplaceTransactionNextStatus,
  transitionMarketplaceTransactionStatus
} from './marketplace-transaction.utils';
import {
  type MarketplaceTransactionTransitionContext as Ctx,
  MARKETPLACE_TRANSACTION_ACTIONS,
  MARKETPLACE_TRANSACTION_STATUSES,
  type MarketplaceTransactionAction,
  type MarketplaceTransactionActorRole,
  type MarketplaceTransactionStatus
} from './marketplace-transaction.models';

type Key = `${MarketplaceTransactionStatus | 'none'}|${MarketplaceTransactionActorRole}|${MarketplaceTransactionAction}`;

const ROLES: MarketplaceTransactionActorRole[] = ['buyer', 'seller', 'admin'];
const NOTE = {shippingNote: 'DHL 123'};

/** Independent oracle: every legal (status, role, action) -> next status. Anything else must be rejected. */
const ALLOWED = new Map<Key, MarketplaceTransactionStatus>([
  ['none|buyer|buyer_inquire', 'proposed'],
  ...(['proposed', 'negotiating'] as const).flatMap((s): [Key, MarketplaceTransactionStatus][] => [
    [`${s}|seller|seller_accept`, 'accepted'],
    [`${s}|seller|seller_decline`, 'cancelled_by_seller'],
    [`${s}|seller|seller_cancel`, 'cancelled_by_seller'],
    [`${s}|seller|seller_counter`, 'negotiating'],
    [`${s}|buyer|buyer_cancel`, 'cancelled_by_buyer'],
    [`${s}|buyer|mutual_cancel`, 'cancelled_mutual'],
    [`${s}|seller|mutual_cancel`, 'cancelled_mutual'],
    [`${s}|admin|mutual_cancel`, 'cancelled_mutual']
  ]),
  ['accepted|buyer|buyer_mark_paid', 'paid'],
  ['paid|seller|seller_mark_shipped', 'shipped'],
  ['shipped|buyer|buyer_mark_received', 'received'],
  ['received|seller|close_completed', 'closed'],
  ['received|admin|close_completed', 'closed'],
  ...(['accepted', 'paid', 'shipped', 'received'] as const).flatMap((s): [Key, MarketplaceTransactionStatus][] =>
    ROLES.map((r): [Key, MarketplaceTransactionStatus] => [`${s}|${r}|open_dispute`, 'disputed'])
  )
]);

describe('marketplace transaction lifecycle — exhaustive matrix', () => {
  const statuses: (MarketplaceTransactionStatus | null)[] = [null, ...MARKETPLACE_TRANSACTION_STATUSES];

  it('accepts exactly the oracle transitions and rejects every other combination', () => {
    let checked = 0;
    for (const status of statuses) {
      for (const role of ROLES) {
        for (const action of MARKETPLACE_TRANSACTION_ACTIONS) {
          const key = `${status ?? 'none'}|${role}|${action}` as Key;
          const result = transitionMarketplaceTransactionStatus(status, role, action, NOTE);
          const expected = ALLOWED.get(key);
          if (expected) {
            expect(result).withContext(key).toEqual({ok: true, nextStatus: expected});
          } else {
            expect(result.ok).withContext(key).toBeFalse();
          }
          checked++;
        }
      }
    }
    expect(checked).toBe(statuses.length * ROLES.length * MARKETPLACE_TRANSACTION_ACTIONS.length);
  });

  it('terminal statuses reject every role/action with terminal_status', () => {
    for (const status of ['closed', 'cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_mutual', 'disputed'] as const) {
      for (const role of ROLES) {
        for (const action of MARKETPLACE_TRANSACTION_ACTIONS) {
          expect(transitionMarketplaceTransactionStatus(status, role, action, NOTE))
            .withContext(`${status}|${role}|${action}`)
            .toEqual(jasmine.objectContaining({ok: false, code: 'terminal_status'}));
        }
      }
    }
  });

  it('cannot skip payment or shipment steps', () => {
    expect(transitionMarketplaceTransactionStatus('accepted', 'seller', 'seller_mark_shipped', NOTE).ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('accepted', 'buyer', 'buyer_mark_received').ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('paid', 'buyer', 'buyer_mark_received').ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('shipped', 'seller', 'close_completed').ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('paid', 'admin', 'close_completed').ok).toBeFalse();
  });

  it('a buyer cannot accept, ship, or close; a seller cannot mark paid or received', () => {
    expect(transitionMarketplaceTransactionStatus('proposed', 'buyer', 'seller_accept').ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('accepted', 'seller', 'buyer_mark_paid').ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('shipped', 'seller', 'buyer_mark_received').ok).toBeFalse();
    expect(transitionMarketplaceTransactionStatus('received', 'buyer', 'close_completed').ok).toBeFalse();
  });

  describe('shipping note gate', () => {
    const ship = (ctx: unknown) => transitionMarketplaceTransactionStatus('paid', 'seller', 'seller_mark_shipped', ctx as Ctx);

    it('rejects missing, null, blank, whitespace and non-string notes', () => {
      for (const ctx of [undefined, null, {}, {shippingNote: ''}, {shippingNote: '   \n\t'}, {trackingNote: ' '},
        {shippingNote: null, trackingNote: null}, {shippingNote: 42}, {shippingNote: ['x']}]) {
        expect(ship(ctx)).withContext(JSON.stringify(ctx)).toEqual(jasmine.objectContaining({ok: false, code: 'shipping_note_required'}));
      }
    });

    it('accepts either a shipping or a tracking note', () => {
      expect(ship({shippingNote: 'posted'}).ok).toBeTrue();
      expect(ship({trackingNote: 'TRK1'}).ok).toBeTrue();
      expect(ship({shippingNote: ' ', trackingNote: 'TRK1'}).ok).toBeTrue();
    });
  });

  describe('input validation', () => {
    it('rejects unknown status, actor and action with specific codes', () => {
      expect(transitionMarketplaceTransactionStatus('bogus' as never, 'buyer', 'buyer_cancel'))
        .toEqual(jasmine.objectContaining({ok: false, code: 'invalid_status'}));
      expect(transitionMarketplaceTransactionStatus('proposed', 'root' as never, 'buyer_cancel'))
        .toEqual(jasmine.objectContaining({ok: false, code: 'invalid_actor'}));
      expect(transitionMarketplaceTransactionStatus('proposed', 'buyer', 'steal' as never))
        .toEqual(jasmine.objectContaining({ok: false, code: 'invalid_action'}));
      expect(transitionMarketplaceTransactionStatus('proposed', '__proto__' as never, 'buyer_cancel').ok).toBeFalse();
      expect(transitionMarketplaceTransactionStatus('proposed', 'buyer', 'constructor' as never).ok).toBeFalse();
    });

    it('treats empty-string status as invalid, not as a new transaction', () => {
      expect(transitionMarketplaceTransactionStatus('' as never, 'buyer', 'buyer_inquire'))
        .toEqual(jasmine.objectContaining({ok: false, code: 'invalid_status'}));
    });
  });

  describe('next action chips', () => {
    it('only offers chips that are legal transitions (plus the disabled ship chip)', () => {
      for (const status of statuses) {
        for (const role of ROLES) {
          for (const chip of getMarketplaceTransactionNextActionChips(status, role, NOTE)) {
            expect(ALLOWED.get(`${status ?? 'none'}|${role}|${chip.action}` as Key))
              .withContext(`${status}|${role}|${chip.action}`).toBe(chip.nextStatus);
          }
        }
      }
    });

    it('offers no chips for terminal statuses or unknown roles', () => {
      expect(getMarketplaceTransactionNextActionChips('closed', 'admin')).toEqual([]);
      expect(getMarketplaceTransactionNextActionChips('disputed', 'buyer')).toEqual([]);
      expect(getMarketplaceTransactionNextActionChips('paid', 'root' as never)).toEqual([]);
    });

    it('shows Mark shipped as disabled with a reason until a note exists', () => {
      const chips = getMarketplaceTransactionNextActionChips('paid', 'seller', {shippingNote: ' '});
      const ship = chips.find(c => c.action === 'seller_mark_shipped');
      expect(ship?.disabled).toBeTrue();
      expect(ship?.reason).toContain('shipping');
      expect(ship?.nextStatus).toBeUndefined();
      const enabled = getMarketplaceTransactionNextActionChips('paid', 'seller', NOTE)
        .find(c => c.action === 'seller_mark_shipped');
      expect(enabled?.disabled).toBeFalsy();
      expect(enabled?.nextStatus).toBe('shipped');
    });
  });

  describe('getMarketplaceTransactionNextStatus (default actor)', () => {
    it('never lets the default actor bypass the shipping note gate', () => {
      expect(getMarketplaceTransactionNextStatus('paid', 'seller_mark_shipped')).toBeUndefined();
    });

    it('resolves the happy path via default roles', () => {
      expect(getMarketplaceTransactionNextStatus(undefined, 'buyer_inquire')).toBe('proposed');
      expect(getMarketplaceTransactionNextStatus('proposed', 'seller_accept')).toBe('accepted');
      expect(getMarketplaceTransactionNextStatus('accepted', 'buyer_mark_paid')).toBe('paid');
      expect(getMarketplaceTransactionNextStatus('shipped', 'buyer_mark_received')).toBe('received');
      expect(getMarketplaceTransactionNextStatus('received', 'close_completed')).toBe('closed');
    });
  });
});
