import { Injectable, OnDestroy } from '@angular/core';
import {
  MediaChange,
  MediaObserver
} from '@angular/flex-layout';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  debounceTime,
  map,
  startWith,
  takeUntil
} from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AppFormUtils } from "src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils";

export interface LayoutFlexWidthState {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  ltsm: boolean;
  ltmd: boolean;
  ltlg: boolean;
  ltxl: boolean;
  gtxs: boolean;
  gtsm: boolean;
  gtmd: boolean;
  gtlg: boolean;
}

const DEFAULT_LAYOUT_FLEX_WIDTH_STATE: LayoutFlexWidthState = {
  xs: false,
  sm: false,
  md: false,
  lg: false,
  xl: false,
  ltsm: false,
  ltmd: false,
  ltlg: false,
  ltxl: false,
  gtxs: false,
  gtsm: false,
  gtmd: false,
  gtlg: false
};

function buildLayoutFlexWidthState(changes: MediaChange[]): LayoutFlexWidthState {
  const aliases = new Set(changes.map((change) => change.mqAlias));
  return {
    xs: aliases.has('xs'),
    sm: aliases.has('sm'),
    md: aliases.has('md'),
    lg: aliases.has('lg'),
    xl: aliases.has('xl'),
    ltsm: aliases.has('lt-sm'),
    ltmd: aliases.has('lt-md'),
    ltlg: aliases.has('lt-lg'),
    ltxl: aliases.has('lt-xl'),
    gtxs: aliases.has('gt-xs'),
    gtsm: aliases.has('gt-sm'),
    gtmd: aliases.has('gt-md'),
    gtlg: aliases.has('gt-lg')
  };
}


@Injectable()
export class AppStateService implements OnDestroy {
  
  /*
   *  this one is needed in service form to be able to access it from the HTML
   *
   */
  readonly globalUtils = {
    errorProvider: (formControl: UntypedFormControl) => AppFormUtils.getErrors(formControl)
  };
  
  readonly isDev = !environment.production;

  private readonly _preferredPanelColor$ = new BehaviorSubject<number | null>(this.loadPreferredPanelColor());
  readonly preferredPanelColor$ = this._preferredPanelColor$.asObservable();

  setPreferredPanelColor(color: number | null): void {
    this._preferredPanelColor$.next(color);
    if (color === null) {
      localStorage.removeItem('preferredPanelColor');
    } else {
      localStorage.setItem('preferredPanelColor', String(color));
    }
  }

  private loadPreferredPanelColor(): number | null {
    const raw = localStorage.getItem('preferredPanelColor');
    if (raw === null) return null;
    const parsed = Number(raw);
    return (parsed === 1 || parsed === 2) ? parsed : null;
  }

  protected destroyEvent$ = new Subject<void>();
  
  layoutFlexWidth$ = new ReplaySubject<LayoutFlexWidthState>(1);
  
  constructor(
    public mediaObserver: MediaObserver
  ) {
    
    this.mediaObserver.asObservable()
        .pipe(
          takeUntil(this.destroyEvent$),
          map((changes) => buildLayoutFlexWidthState(changes)),
          debounceTime(250),
          startWith(DEFAULT_LAYOUT_FLEX_WIDTH_STATE)
        )
        .subscribe(value => this.layoutFlexWidth$.next(value));
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
