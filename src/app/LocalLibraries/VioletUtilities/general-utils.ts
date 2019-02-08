import { MatSnackBar } from '@angular/material';
import {
  DomSanitizer,
  SafeUrl
}                      from '@angular/platform-browser';
import {
  Event,
  NavigationEnd
}                      from '@angular/router';
import {
  Observable,
  Subscription,
  throwError as _throw,
  timer
}                      from 'rxjs';
import {
  finalize,
  mergeMap
}                      from 'rxjs/operators';
import { isString }    from 'util';

export class AngularUtils {
  /**
   * Add with public sanitizer: DomSanitizer
   */
  static sanitizeURL(url: string, sanitizer: DomSanitizer): SafeUrl {
    return sanitizer.bypassSecurityTrustUrl(url);
  }
  
}

export class ObservableUtils {
  
  /**
   * @deprecated Use new paradigm
   * Automatically paramsHolder.eventunsubscribes passed params if they're not null
   */
  static autoUnsubscribe(...subs: Array<Subscription>) {
    subs.forEach(currSub => {
      
      if (currSub) {
        currSub.unsubscribe();
      }
    });
  }
  
}

export class RouterUtils {
  /**
   * Abstraction for checking if we are in a page and doing stuff if we are there
   */
  static doStuffIfInSpecifiedPage(paramsHolder: SpecificPageActor) {
    if (paramsHolder.event instanceof NavigationEnd) {
      const url: string = paramsHolder.event.url;
      const isInPage: boolean = isString(url) && url.includes(paramsHolder.desiredPageURL);
      LanguageUtils.executeIfExists(isInPage ? paramsHolder.toDo : paramsHolder.toDoIfNot);
    }
  }
  
}

export class ThreadingUtils {
  static runInNewThread_simple(toExecute: () => void) {
    setTimeout(
      args => {
        toExecute();
      },
      0
    );
  }
}

export interface SpecificPageActor {
  /**
   * Arrives from your subscription to router probably, it's the one
   */
  event: Event;
  /**
   * Should have no '/', pass a raw string like 'Raccolta_dati' in 'http://localhost:4200/Raccolta_dati'
   */
  desiredPageURL: string;
  
  /**
   * Callback for actions to perform if we are in the specified page
   */
  toDo?(): void;
  
  /**
   * Callback for actions to perform if we ARE NOT in the specified page
   */
  toDoIfNot?(): void;
}

export function isFunction(obj: any): obj is Function {
  return typeof obj === 'function';
}

export class LanguageUtils {
  static executeIfExists(callback?: () => void) {
    // noinspection TsLint
    isFunction(callback) && callback();
  }
  
  static getLastElementOfArray<T>(array: Array<T>): T | undefined {
    return array[array.length - 1];
  }
}

// export class CryptoUtils {
//     public static getSHA1ofObject(input: any, salt?: string): string {
//         const toHash = isString(salt) ? input + salt : input;
//         return sha1(toHash);
//     };
// }

// export class MomentUtils {
//     public static readonly formatPatterns = {
//         human: {
//             fullUTC: 'YYYY-MM-DD HH:mm Z',
//             full: 'YYYY-MM-DD HH:mm'
//         }
//     };
//
//     public static timeDifferenceInMillis(recent: Date, far: Date): number {
//         const from = moment.utc(recent);
//         const to = moment.utc(far);
//         return from.diff(to, 'ms', true);
//     }
//
//     public static dateToCentMin(timeResult: number) {
//         return Math.round((timeResult / 600));
//     }
//
// }

export class CommunicationUtils {
  
  /**
   * Add with public SnackBar: MatSnackBar
   */
  static showSnackbar(snackReference: MatSnackBar, message: string, /*action?: () => void,*/ duration: number) {
    snackReference.open(
      message, /*isFunction(action) ? action : */null, {
        duration
      }
    );
  }
  
  // public static showSnackbar_withAction(snackReference: MatSnackBar, message: string, /*action?: () => void,*/ duration: number) {
  //     snackReference.open(
  //         message, /*isFunction(action) ? action : */null, {
  //             duration: duration,
  //
  //         }
  //     );
  // }
}

export class CalculusUtils {
  static PercentageOfNumber(total: number, value: number) {
    return 100 * value / total;
  }
  
  /**
   * 100 * subTotal / total
   * @param total
   * @param subTotal
   */
  static subtotalInPercentage(total, subTotal) {
    return 100 * subTotal / total;
  }
}

export interface GenericRetrySettings {
  maxRetryAttempts?: number;
  scalingDuration?: number;
  excludedStatusCodes?: Array<number>;
}

export const genericRetryStrategy = ({
                                       maxRetryAttempts = 3,
                                       scalingDuration = 1000,
                                       excludedStatusCodes = []
                                     }: GenericRetrySettings = {}) => (attempts: Observable<any>) =>
  attempts.pipe(
    mergeMap((error, i) => {
      const retryAttempt = i + 1;
      // if maximum number of retries have been met
      // or response is a status code we don't wish to retry, throw error
      if (
        retryAttempt > maxRetryAttempts ||
        excludedStatusCodes.find(e => e === error.status)
      ) {
        return _throw(error);
      }
      console.log(
        `Attempt ${ retryAttempt }: retrying in ${ retryAttempt *
                                                   scalingDuration }ms`
      );
      // retry after 1s, 2s, etc...
      return timer(retryAttempt * scalingDuration);
    }),
    finalize(() => console.log('We are done!'))
  );
