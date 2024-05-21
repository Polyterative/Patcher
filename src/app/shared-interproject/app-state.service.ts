import {
  Injectable,
  SecurityContext
}                             from '@angular/core';
import { MediaObserver }      from '@angular/flex-layout';
import { UntypedFormControl } from '@angular/forms';
import {
  Observable,
  ReplaySubject,
  Subject
}                             from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  startWith,
  takeUntil
}                             from 'rxjs/operators';
import { environment }        from 'src/environments/environment';
import { AppFormUtils }       from './app-form-utils';
import { DomSanitizer }       from "@angular/platform-browser";


@Injectable()
export class AppStateService {
  
  /*
   *  this one is needed in service form to be able to access it from the HTML
   *
   */
  readonly globalUtils = {
    errorProvider: (formControl: UntypedFormControl) => AppFormUtils.getErrors(formControl)
  };
  
  readonly isDev = !environment.production;
  
  protected destroyEvent$ = new Subject<void>();
  
  layoutFlexWidth$ = new ReplaySubject<{
    xs: boolean,
    sm: boolean,
    md: boolean,
    lg: boolean,
    xl: boolean,
    ltsm: boolean,
    ltmd: boolean,
    ltlg: boolean,
    ltxl: boolean,
    gtxs: boolean,
    gtsm: boolean,
    gtmd: boolean,
    gtlg: boolean
  }>(1);
  
  constructor(
    public mediaObserver: MediaObserver
  ) {
    
    this.mediaObserver.asObservable()
        .pipe(
          takeUntil(this.destroyEvent$),
          // tap((x) => console.log(x)),
          map(x => ({
            xs: x.some(x => x.mqAlias === 'xs'),
            sm: x.some(x => x.mqAlias === 'sm'),
            md: x.some(x => x.mqAlias === 'md'),
            lg: x.some(x => x.mqAlias === 'lg'),
            xl: x.some(x => x.mqAlias === 'xl'),
            //
            ltsm: x.some(x => x.mqAlias === 'lt-sm'),
            ltmd: x.some(x => x.mqAlias === 'lt-md'),
            ltlg: x.some(x => x.mqAlias === 'lt-lg'),
            ltxl: x.some(x => x.mqAlias === 'lt-xl'),
            //
            gtxs: x.some(x => x.mqAlias === 'gt-xs'),
            gtsm: x.some(x => x.mqAlias === 'gt-sm'),
            gtmd: x.some(x => x.mqAlias === 'gt-md'),
            gtlg: x.some(x => x.mqAlias === 'gt-lg')
          })),
          // distinctUntilChanged((a,b) =>a.),
          debounceTime(250),
          startWith({
            xs:   false,
            sm:   false,
            md:   false,
            lg:   false,
            xl:   false,
            ltsm: false,
            ltmd: false,
            ltlg: false,
            ltxl: false,
            gtxs: false,
            gtsm: false,
            gtmd: false,
            gtlg: false
          })
        )
        .subscribe(value => this.layoutFlexWidth$.next(value));
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}


export function sanitizeItemInFlow(sanitizer: DomSanitizer) {
  return (source: Observable<string>) => source.pipe(
    // Sanitize the comment
    map((x: string) => sanitizer.sanitize(SecurityContext.HTML, x) || ''),
    // Strip all tags
    map(x => x.replace(/<[^>]*>?/gm, '')),
    // Remove all leading and trailing whitespaces
    map(x => x.trim()),
    // Last check before sending the comment
    filter(x => !!x && x.length > 0)
  );
}

export function plainSanitize(sanitizer: DomSanitizer, x: string) {
  return sanitizer.sanitize(SecurityContext.HTML, x)
      .replace(/<[^>]*>?/gm, '')
      .trim()
    || undefined;
}

export function sanitizeObjectInFlow<T>(sanitizer: DomSanitizer) {
  return (source: Observable<T>) => source.pipe(
    // Sanitize every property of the object
    map(x => {
      Object.keys(x).forEach(key => {
        x[key] = sanitizer.sanitize(SecurityContext.HTML, x[key]) || undefined;
      });
      return x;
    })
  );
}