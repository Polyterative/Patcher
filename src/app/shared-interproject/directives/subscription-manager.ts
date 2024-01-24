import { Directive, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

/**
 * Utility class to manage the subscriptions.
 * Can be extended by a component to dispose all the subscription on OnDestroy
 */
@Directive()
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class SubManager implements OnDestroy {
  protected _subscriptions: Subscription[] = [];
  
  destroy$ = new Subject<void>();
  
  /**
   * Add a new subscription to manage.
   * @param {Subscription} [subscription] Subscription to add.
   * deprecated
   * @deprecated Use the takeUntil operator instead
   */
  manageSub(subscription?: Subscription) {
    if (subscription) {
      this._subscriptions.push(subscription);
    }
  }

  /** Unsubscribe from all the subscriptions */
  unsubscribeAll() {
    this.unsubscribeArray(this._subscriptions);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.unsubscribeAll();
  }
  
  /**
   * Unsubscribes an array of subscriptions.
   * @param {Subscription[]} arrayOfSubscriptions The array of subscriptions
   * @param {boolean} [emptyArray=true] If the length of the array should be set to 0
   */
  unsubscribeArray(arrayOfSubscriptions: Subscription[], emptyArray = true) {
    for (const s of arrayOfSubscriptions) {
      if (!s.closed) {
        s.unsubscribe();
      }
    }
    if (emptyArray) {
      arrayOfSubscriptions.length = 0;
    }
  }
}
