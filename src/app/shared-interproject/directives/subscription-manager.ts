import {
  Directive,
  OnDestroy
}                       from '@angular/core';
import { Subscription } from 'rxjs';


/**
 * Utility class to manage the subscriptions.
 * Can be extended by a component to dispose all the subscription on OnDestroy
 */
@Directive()
// tslint:disable-next-line: directive-class-suffix
export class SubManager implements OnDestroy {
  protected _subscriptions: Subscription[] = [];
  
  /**
   * Add a new subscription to manage.
   * @param {Subscription} [subscription] Subscription to add.
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