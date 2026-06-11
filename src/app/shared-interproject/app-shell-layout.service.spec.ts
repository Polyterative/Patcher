import {
  BreakpointObserver,
  BreakpointState
} from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import {
  APP_SHELL_WIDE_QUERY,
  AppShellLayoutService
} from './app-shell-layout.service';


describe('AppShellLayoutService', () => {
  let state$: BehaviorSubject<BreakpointState>;

  beforeEach(() => {
    state$ = new BehaviorSubject<BreakpointState>({
      matches: false,
      breakpoints: {
        [APP_SHELL_WIDE_QUERY]: false
      }
    });

    TestBed.configureTestingModule({
      providers: [
        AppShellLayoutService,
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => state$.asObservable()
          }
        }
      ]
    });
  });

  it('emits the shared wide-shell breakpoint state without duplicate transitions', () => {
    const service = TestBed.inject(AppShellLayoutService);
    const emissions: boolean[] = [];
    const sub = service.wideShell$.subscribe((value) => emissions.push(value));

    state$.next({
      matches: false,
      breakpoints: {
        [APP_SHELL_WIDE_QUERY]: false
      }
    });
    state$.next({
      matches: true,
      breakpoints: {
        [APP_SHELL_WIDE_QUERY]: true
      }
    });
    state$.next({
      matches: true,
      breakpoints: {
        [APP_SHELL_WIDE_QUERY]: true
      }
    });
    state$.next({
      matches: false,
      breakpoints: {
        [APP_SHELL_WIDE_QUERY]: false
      }
    });

    expect(emissions).toEqual([false, true, false]);
    sub.unsubscribe();
  });

  it('keeps the Material mobile toolbar active below the true-mobile cutoff', () => {
    expect(APP_SHELL_WIDE_QUERY).toBe('(min-width: 37.5rem)');
  });

  it('emits initial state on subscription', () => {
    const service = TestBed.inject(AppShellLayoutService);
    const emissions: boolean[] = [];

    service.wideShell$.subscribe(v => emissions.push(v));
    expect(emissions).toEqual([false]);
  });

  it('replays latest value to late subscribers (shareReplay)', () => {
    const service = TestBed.inject(AppShellLayoutService);
    let firstValue: boolean | undefined;
    service.wideShell$.subscribe(v => firstValue = v);

    state$.next({matches: true, breakpoints: {[APP_SHELL_WIDE_QUERY]: true}});

    let replayedValue: boolean | undefined;
    service.wideShell$.subscribe(v => replayedValue = v);
    expect(replayedValue).toBe(true);
  });
});
