import { Injectable }    from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { FormControl }   from '@angular/forms';
import { Subject }       from 'rxjs';
import {
  debounceTime,
  map,
  share,
  startWith,
  takeUntil
}                        from 'rxjs/operators';
import { AppFormUtils }  from './app-form-utils';

@Injectable()
export class AppStateService {
  
  /*
   *  this one is needed in service form to be able to access it from the HTML
   *
   */
  readonly globalUtils = {
    errorProvider: (formControl: FormControl) => AppFormUtils.getErrors(formControl)
  };
  
  constructor(
    public mediaObserver: MediaObserver
  ) {}
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  
  layoutFlexWidth$ =
    this.mediaObserver.asObservable()
        .pipe(
          takeUntil(this.destroyEvent$),
          // tap((x) => console.log(x)),
          map((x) => ({
            xs: x.some((x) => x.mqAlias === 'xs'),
            sm: x.some((x) => x.mqAlias === 'sm'),
            md: x.some((x) => x.mqAlias === 'md'),
            lg: x.some((x) => x.mqAlias === 'lg'),
            xl: x.some((x) => x.mqAlias === 'xl'),
            //
            ltsm: x.some((x) => x.mqAlias === 'lt-sm'),
            ltmd: x.some((x) => x.mqAlias === 'lt-md'),
            ltlg: x.some((x) => x.mqAlias === 'lt-lg'),
            ltxl: x.some((x) => x.mqAlias === 'lt-xl'),
            //
            gtxs: x.some((x) => x.mqAlias === 'gt-xs'),
            gtsm: x.some((x) => x.mqAlias === 'gt-sm'),
            gtmd: x.some((x) => x.mqAlias === 'gt-md'),
            gtlg: x.some((x) => x.mqAlias === 'gt-lg')
          })),
          // distinctUntilChanged((a,b) =>a.),
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
          }),
          debounceTime(250),
          share()
        );
  
}
