import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { MediaObserver } from '@angular/flex-layout';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AppStateService } from './app-state.service';


const BREAKPOINT_KEYS = ['xs', 'sm', 'md', 'lg', 'xl', 'ltsm', 'ltmd', 'ltlg', 'ltxl', 'gtxs', 'gtsm', 'gtmd', 'gtlg'] as const;

describe('AppStateService', () => {
  const mockMediaObserver = {
    asObservable: () => of([{mqAlias: 'gt-xs'}, {mqAlias: 'sm'}])
  };
  
  function buildService(): AppStateService {
    TestBed.configureTestingModule({
      providers: [
        AppStateService,
        {provide: MediaObserver, useValue: mockMediaObserver}
      ]
    });
    return TestBed.inject(AppStateService);
  }
  
  afterEach(() => {
    TestBed.resetTestingModule();
  });
  
  it('isDev reflects !environment.production', () => {
    const service = buildService();
    expect(service.isDev).toBe(!environment.production);
  });
  
  it('layoutFlexWidth$ emits an object with all 13 boolean breakpoint keys', (done) => {
    const service = buildService();
    service.layoutFlexWidth$.pipe(take(1)).subscribe(value => {
      expect(Object.keys(value).length).toBe(13);
      BREAKPOINT_KEYS.forEach(key => {
        expect(typeof value[key]).toBe('boolean');
      });
      done();
    });
  });
  
  it('breakpoint keys matching emitted mqAliases are true after debounce', fakeAsync(() => {
    const service = buildService();
    let latestValue: any;
    service.layoutFlexWidth$.subscribe(val => (latestValue = val));
    
    tick(250);
    
    // 'gt-xs' maps to gtxs, 'sm' maps to sm
    expect(latestValue.sm).toBeTrue();
    expect(latestValue.gtxs).toBeTrue();
    // keys not in the mock emission should be false
    expect(latestValue.xs).toBeFalse();
    expect(latestValue.md).toBeFalse();
    expect(latestValue.lg).toBeFalse();
  }));
  
  it('ngOnDestroy completes destroyEvent$ without error', () => {
    const service = buildService();
    expect(() => service.ngOnDestroy()).not.toThrow();
  });
});
