import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { MediaObserver } from '@angular/flex-layout';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AppStateService, LayoutFlexWidthState } from './app-state.service';


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
  
  it('breakpoint keys matching emitted mqAliases are true after a frame-sized batch', fakeAsync(() => {
    const service = buildService();
    let latestValue: LayoutFlexWidthState | undefined;
    service.layoutFlexWidth$.subscribe(val => (latestValue = val));
    
    tick(16);
    
    // 'gt-xs' maps to gtxs, 'sm' maps to sm
    expect(latestValue?.sm).toBeTrue();
    expect(latestValue?.gtxs).toBeTrue();
    // keys not in the mock emission should be false
    expect(latestValue?.xs).toBeFalse();
    expect(latestValue?.md).toBeFalse();
    expect(latestValue?.lg).toBeFalse();
  }));
  
  it('setPreferredPanelColor stores and emits the color', (done) => {
    const service = buildService();
    service.setPreferredPanelColor(1);
    expect(localStorage.getItem('preferredPanelColor')).toBe('1');
    service.preferredPanelColor$.pipe(take(1)).subscribe(val => {
      expect(val).toBe(1);
      done();
    });
  });

  it('setPreferredPanelColor(null) removes the localStorage key and emits null', (done) => {
    const service = buildService();
    localStorage.setItem('preferredPanelColor', '2');
    service.setPreferredPanelColor(null);
    expect(localStorage.getItem('preferredPanelColor')).toBeNull();
    service.preferredPanelColor$.pipe(take(1)).subscribe(val => {
      expect(val).toBeNull();
      done();
    });
  });

  it('loadPreferredPanelColor ignores values other than 1 or 2', () => {
    localStorage.setItem('preferredPanelColor', '99');
    const service = buildService();
    let loaded: number | null | undefined;
    service.preferredPanelColor$.pipe(take(1)).subscribe(v => (loaded = v));
    expect(loaded).toBeNull();
  });
});
