import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { Injectable, OnDestroy } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  Subject
} from 'rxjs';
import {
  auditTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith
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

const LAYOUT_FLEX_MEDIA_QUERIES = {
  xs: '(max-width: 37.4375rem)',
  sm: '(min-width: 37.5rem) and (max-width: 59.9375rem)',
  md: '(min-width: 60rem) and (max-width: 79.9375rem)',
  lg: '(min-width: 80rem) and (max-width: 119.9375rem)',
  xl: '(min-width: 120rem)',
  ltsm: '(max-width: 37.4375rem)',
  ltmd: '(max-width: 59.9375rem)',
  ltlg: '(max-width: 79.9375rem)',
  ltxl: '(max-width: 119.9375rem)',
  gtxs: '(min-width: 37.5rem)',
  gtsm: '(min-width: 60rem)',
  gtmd: '(min-width: 80rem)',
  gtlg: '(min-width: 120rem)'
} satisfies Record<keyof LayoutFlexWidthState, string>;

const LAYOUT_FLEX_MEDIA_QUERY_LIST = Object.values(LAYOUT_FLEX_MEDIA_QUERIES);

function buildLayoutFlexWidthState(state: BreakpointState): LayoutFlexWidthState {
  const matches = (key: keyof LayoutFlexWidthState): boolean => !!state.breakpoints[LAYOUT_FLEX_MEDIA_QUERIES[key]];
  return {
    xs: matches('xs'),
    sm: matches('sm'),
    md: matches('md'),
    lg: matches('lg'),
    xl: matches('xl'),
    ltsm: matches('ltsm'),
    ltmd: matches('ltmd'),
    ltlg: matches('ltlg'),
    ltxl: matches('ltxl'),
    gtxs: matches('gtxs'),
    gtsm: matches('gtsm'),
    gtmd: matches('gtmd'),
    gtlg: matches('gtlg')
  };
}

function sameLayoutFlexWidthState(a: LayoutFlexWidthState, b: LayoutFlexWidthState): boolean {
  return a.xs === b.xs
    && a.sm === b.sm
    && a.md === b.md
    && a.lg === b.lg
    && a.xl === b.xl
    && a.ltsm === b.ltsm
    && a.ltmd === b.ltmd
    && a.ltlg === b.ltlg
    && a.ltxl === b.ltxl
    && a.gtxs === b.gtxs
    && a.gtsm === b.gtsm
    && a.gtmd === b.gtmd
    && a.gtlg === b.gtlg;
}


@Injectable()
export class AppStateService extends SubManager implements OnDestroy {
  
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
  
  readonly layoutFlexWidth$: Observable<LayoutFlexWidthState>;
  
  constructor(
    private readonly breakpointObserver: BreakpointObserver
  ) {
    super();
    this.layoutFlexWidth$ = this.breakpointObserver.observe(LAYOUT_FLEX_MEDIA_QUERY_LIST)
      .pipe(
        this.takeUntilDestroyed(),
        map((state) => buildLayoutFlexWidthState(state)),
        auditTime(16),
        startWith(DEFAULT_LAYOUT_FLEX_WIDTH_STATE),
        distinctUntilChanged(sameLayoutFlexWidthState),
        shareReplay({bufferSize: 1, refCount: true})
      );
  }
  
  ngOnDestroy(): void {
    super.ngOnDestroy();
    
  }
  
}
