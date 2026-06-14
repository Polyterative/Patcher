import {
  DestroyRef,
  Directive,
  OnDestroy
} from '@angular/core';
import { takeUntilDestroyed as angularTakeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MonoTypeOperatorFunction,
  Subject,
  Subscription
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Utility class to manage the subscriptions.
 * Can be extended by a component to dispose all the subscription on OnDestroy
 */
@Directive()
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class SubManager implements OnDestroy {
  protected _subscriptions: Subscription[] = [];

  destroy$ = new Subject<void>();

  private destroyed = false;
  private unregisterDestroyRef?: () => void;

  constructor(private readonly destroyRef?: DestroyRef) {
    this.unregisterDestroyRef = this.destroyRef?.onDestroy(() => this.destroy());
  }

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

  protected takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T> {
    if (!this.destroyRef) {
      return takeUntil(this.destroy$);
    }

    return (source) => source.pipe(
      angularTakeUntilDestroyed(this.destroyRef),
      takeUntil(this.destroy$)
    );
  }

  ngOnDestroy(): void {
    this.unregisterDestroyRef?.();
    this.destroy();
  }

  private destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
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
