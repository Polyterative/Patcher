import { BehaviorSubject, Subject } from 'rxjs';
import { AutoContentLoadingIndicatorComponent } from './auto-content-loading-indicator.component';

function makeComp(): AutoContentLoadingIndicatorComponent {
  return new AutoContentLoadingIndicatorComponent();
}

describe('AutoContentLoadingIndicatorComponent', () => {
  describe('initial state', () => {
    it('starts with dataLoading$ = true', () => {
      const comp = makeComp();
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });

    it('exposes default input values', () => {
      const comp = makeComp();
      expect(comp.loadingLines).toBe(1);
      expect(comp.skipFirstData).toBeFalse();
      expect(comp.loadingLabel).toBe('Loading content');
    });
  });

  describe('ngOnInit — missing inputs', () => {
    it('does not throw when neither data$ nor updateData$ is provided', () => {
      const comp = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });

    it('does not throw when only data$ is provided (no updateData$)', () => {
      const comp = makeComp();
      comp.data$ = new BehaviorSubject(null);
      expect(() => comp.ngOnInit()).not.toThrow();
    });

    it('does not throw when only updateData$ is provided (no data$)', () => {
      const comp = makeComp();
      comp.updateData$ = new BehaviorSubject(null);
      expect(() => comp.ngOnInit()).not.toThrow();
    });

    it('remains loading when no inputs are wired', () => {
      const comp = makeComp();
      comp.ngOnInit();
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });
  });

  describe('ngOnInit — wired inputs', () => {
    it('sets dataLoading$ = false when data$ emits a truthy value', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<unknown>(null);
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next({ some: 'data' });
      expect(comp.dataLoading$.getValue()).toBeFalse();
    });

    it('stays loading when data$ emits null/falsy', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<unknown>(null);
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next(null);
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });

    it('stays loading when data$ emits undefined', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<unknown>(undefined);
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next(undefined);
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });

    it('stays loading when data$ emits 0 (falsy)', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<unknown>(0);
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next(0);
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });

    it('sets dataLoading$ = true when updateData$ emits', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<unknown>({ loaded: true });
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      // data loaded → false
      expect(comp.dataLoading$.getValue()).toBeFalse();
      // update triggered → back to true
      update$.next(void 0);
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });

    it('reflects loading cycle: update → loading → data arrives → done', () => {
      const comp = makeComp();
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      update$.next(void 0);
      expect(comp.dataLoading$.getValue()).toBeTrue();

      data$.next({ rows: [] });
      expect(comp.dataLoading$.getValue()).toBeFalse();
    });
  });

  describe('skipFirstData', () => {
    it('skips the first truthy data emission when skipFirstData=true', () => {
      const comp = makeComp();
      comp.skipFirstData = true;
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next({ first: true });
      // first emission skipped — should still be loading
      expect(comp.dataLoading$.getValue()).toBeTrue();

      data$.next({ second: true });
      // second emission processed
      expect(comp.dataLoading$.getValue()).toBeFalse();
    });

    it('does not skip first emission when skipFirstData=false', () => {
      const comp = makeComp();
      comp.skipFirstData = false;
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      data$.next({ first: true });
      expect(comp.dataLoading$.getValue()).toBeFalse();
    });
  });

  describe('ngOnDestroy', () => {
    it('stops reacting to data$ after destroy', () => {
      const comp = makeComp();
      const data$ = new Subject<unknown>();
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      comp.ngOnDestroy();

      data$.next({ after: 'destroy' });
      // should still be loading (no reaction after destroy)
      expect(comp.dataLoading$.getValue()).toBeTrue();
    });

    it('stops reacting to updateData$ after destroy', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<unknown>({ loaded: true });
      const update$ = new Subject<unknown>();
      comp.data$ = data$;
      comp.updateData$ = update$;
      comp.ngOnInit();

      expect(comp.dataLoading$.getValue()).toBeFalse();
      comp.ngOnDestroy();

      update$.next(void 0);
      // stays false (no reaction after destroy)
      expect(comp.dataLoading$.getValue()).toBeFalse();
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
