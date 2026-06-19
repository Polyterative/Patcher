import { InjectionToken } from '@angular/core';
import { environment } from 'src/environments/environment';

export const COOL_REACTIONS_ENABLED = new InjectionToken<boolean>('coolReactionsEnabled', {
  providedIn: 'root',
  factory: () => environment.features.coolReactionsEnabled
});
