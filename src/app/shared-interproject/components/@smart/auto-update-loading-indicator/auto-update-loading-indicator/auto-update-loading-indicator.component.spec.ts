import { BehaviorSubject, Subject } from 'rxjs';
import { AutoUpdateLoadingIndicatorComponent } from './auto-update-loading-indicator.component';

function makeComp(): AutoUpdateLoadingIndicatorComponent {
  return new AutoUpdateLoadingIndicatorComponent();
}

describe('AutoUpdateLoadingIndicatorComponent', () => {
  describe('initial state', () => {
    it('starts with dataLoading$ = true', () => {
      expect(makeComp().dataLoading$.getValue()).toBeTrue();
    });

    it('loadingLines defaults to 1', () => {
      expect(makeComp().loadingLines).toBe(1);
    });

    it('initialLoading defaults to true', () => {
      expect(makeComp().initialLoading).toBeTrue();
    });

    it('skipFirstData defaults to false', () => {
      expect(makeComp().skipFirstData).toBeFalse();
    });

    it('loadingLabel defaults to "Updating results"', () => {
      expect(makeComp().loadingLabel).toBe('Updating results');
    });
  });

  describe('ngOnInit — missing inputs', () => {
    it('does not throw when neither data$ nor updateData$ provided', () => {
      const comp = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });

    it('uses initialLoading when inputs are initialized', () => {
      const comp = makeComp();
      comp.initialLoading = false;
      comp.ngOnInit();
      expect(comp.dataLoading$.getValue()).toBeFalse();
    });

    it('does not throw when only data$ is provided', () => {
      const comp = makeComp();
      comp.data$ = new BehaviorSubject(null);
      expect(() => comp.ngOnInit()).not.toThrow();
    });

    it('remains loading when no inputs wired', () => {
      const comp = makeComp();
      comp.ngOnInit();
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });
  });

  describe('ngOnInit — wired inputs', () => {
    it('sets dataLoading$ = false when data$ emits (any value, no filter)', (done) => {
      const comp = makeComp();
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next(null); // AutoUpdate has no !!data filter
      // observeOn(asapScheduler) — use asap timer
      setTimeout(() => {
        expect(comp.dataLoading$.getValue()).toBeFalse();
        done();
      }, 0);
    });

    it('sets dataLoading$ = true when updateData$ emits', (done) => {
      const comp = makeComp();
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next({ result: 1 });
      setTimeout(() => {
        // data loaded → false, then trigger update
        update$.next(void 0);
        expect(comp.dataLoading$.getValue()).toBeTrue();
        done();
      }, 0);
    });

    it('reflects loading cycle: update → true → data → false', (done) => {
      const comp = makeComp();
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      update$.next(void 0);
      expect(comp.dataLoading$.getValue()).toBeTrue();

      data$.next({ rows: [] });
      setTimeout(() => {
        expect(comp.dataLoading$.getValue()).toBeFalse();
        done();
      }, 0);
    });
  });

  describe('skipFirstData', () => {
    it('skips the first data emission when skipFirstData=true', (done) => {
      const comp = makeComp();
      comp.skipFirstData = true;
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next({ first: true });
      setTimeout(() => {
        // first emission skipped — still loading
        expect(comp.dataLoading$.getValue()).toBeTrue();

        data$.next({ second: true });
        setTimeout(() => {
          expect(comp.dataLoading$.getValue()).toBeFalse();
          done();
        }, 0);
      }, 0);
    });

    it('does not skip first emission when skipFirstData=false', (done) => {
      const comp = makeComp();
      comp.skipFirstData = false;
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next({ first: true });
      setTimeout(() => {
        expect(comp.dataLoading$.getValue()).toBeFalse();
        done();
      }, 0);
    });
  });

  describe('ngOnDestroy', () => {
    it('stops reacting to data$ after destroy', (done) => {
      const comp = makeComp();
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();
      comp.ngOnDestroy();

      data$.next({ after: 'destroy' });
      setTimeout(() => {
        expect(comp.dataLoading$.getValue()).toBeTrue();
        done();
      }, 0);
    });

    it('can be called multiple times without error', () => {
      const comp = makeComp();
      comp.ngOnInit();
      expect(() => {
        comp.ngOnDestroy();
        comp.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
