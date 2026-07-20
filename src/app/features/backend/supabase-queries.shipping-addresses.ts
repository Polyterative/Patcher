import { from as rxFrom, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MarketplaceSavedShippingAddress } from 'src/app/features/marketplace/marketplace-address-book.utils';
import { DbPaths } from './DatabaseStrings';
import {
  remapErrors,
  throwIfSupabaseError
} from './supabase.cache';
import { SupabaseQueriesBase } from './supabase-queries.base';
import {
  mapShippingAddressRow,
  SHIPPING_ADDRESS_COLUMNS,
  type ShippingAddressRow
} from './supabase-shipping-addresses';
import { type SupabaseSingleResponse } from './supabase-db.types';

export class SupabaseShippingAddressQueries extends SupabaseQueriesBase {
  getCurrentUserShippingAddresses(): Observable<MarketplaceSavedShippingAddress[]> {
    return this.getUserSession$().pipe(
      switchMap(user => {
        if (!user) return of({data: []} as SupabaseSingleResponse<ShippingAddressRow[]>);

        return rxFrom(
          this.supabase
            .from(DbPaths.shipping_addresses)
            .select(SHIPPING_ADDRESS_COLUMNS)
            .eq('profileid', user.id)
            .order('is_default', {ascending: false})
            .order('created_at', {ascending: false})
            .order('id', {ascending: false})
        );
      }),
      throwIfSupabaseError<SupabaseSingleResponse<ShippingAddressRow[]>>(),
      remapErrors(),
      map(response => ((response.data ?? []) as ShippingAddressRow[]).map(mapShippingAddressRow))
    );
  }
}
