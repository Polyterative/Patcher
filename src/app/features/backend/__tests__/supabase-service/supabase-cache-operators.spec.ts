/**
 * Tests for the supabase.cache.ts operators:
 *   cacheBust, remapErrors, showSuccessMessage, catchErrors
 * These are tested indirectly via SupabaseService but here we unit-test
 * the exported functions directly to get focused coverage.
 */

import { MatSnackBar } from '@angular/material/snack-bar';
import {
  of,
  throwError
} from 'rxjs';
import {
  cacheBust,
  cacheBuster$,
  catchErrors,
  remapErrors,
  showSuccessMessage
} from '../../supabase.cache';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


describe('supabase.cache - cacheBust operator', () => {
  it('should pass values through unchanged', (done) => {
    of({data: [1, 2, 3]})
      .pipe(cacheBust(['modules']))
      .subscribe({
        next: (val: any) => {
          expect(val.data).toEqual([1, 2, 3]);
          done();
        },
        error: done.fail
      });
  });
  
  it('should emit specified cache keys to cacheBuster$', (done) => {
    const emitted: any[][] = [];
    const sub = cacheBuster$.subscribe(keys => emitted.push(keys as any[]));
    
    of('value')
      .pipe(cacheBust(['patches', 'patchConnections']))
      .subscribe({
        complete: () => {
          sub.unsubscribe();
          expect(emitted.some(keys => keys.includes('patches'))).toBeTrue();
          expect(emitted.some(keys => keys.includes('patchConnections'))).toBeTrue();
          done();
        },
        error: done.fail
      });
  });
  
  it('should not affect error propagation — errors still reach the subscriber', (done) => {
    throwError(() => new Error('upstream error'))
      .pipe(cacheBust(['modules']))
      .subscribe({
        next: () => {
          fail('should not emit');
          done();
        },
        error: (err) => {
          expect(err.message).toBe('upstream error');
          done();
        }
      });
  });
});

describe('supabase.cache - remapErrors operator', () => {
  it('should pass through successful values', (done) => {
    of({data: 'ok', error: null})
      .pipe(remapErrors())
      .subscribe({
        next: (val: any) => {
          expect(val.data).toBe('ok');
          done();
        },
        error: done.fail
      });
  });
  
  it('should pass through null data without throwing', (done) => {
    of({data: null, error: null})
      .pipe(remapErrors())
      .subscribe({
        next: (val: any) => {
          expect(val).toBeDefined();
          done();
        },
        error: done.fail
      });
  });
  
  it('should allow errors from upstream to propagate', (done) => {
    throwError(() => new Error('db fail'))
      .pipe(remapErrors())
      .subscribe({
        next: () => {
          fail('should not emit');
          done();
        },
        error: (err) => {
          expect(err.message).toBe('db fail');
          done();
        }
      });
  });
});

describe('supabase.cache - showSuccessMessage operator', () => {
  it('should call SharedConstants.showSuccessUpdate when a value is emitted', (done) => {
    const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const showSpy = spyOn(SharedConstants, 'showSuccessUpdate');
    
    of({data: 'saved'})
      .pipe(showSuccessMessage(mockSnackBar))
      .subscribe({
        next: () => {
          expect(showSpy).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
  });
  
  it('should pass the value through unchanged', (done) => {
    const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    spyOn(SharedConstants, 'showSuccessUpdate');
    
    of(42)
      .pipe(showSuccessMessage(mockSnackBar))
      .subscribe({
        next: (val: any) => {
          expect(val).toBe(42);
          done();
        },
        error: done.fail
      });
  });
});

describe('supabase.cache - catchErrors operator', () => {
  it('should swallow the error and return NEVER (no further emissions)', (done) => {
    const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    spyOn(SharedConstants, 'errorHandlerOperation').and.callFake(() => (src: any) => src);
    
    let errorPropagated = false;
    
    throwError(() => new Error('oops'))
      .pipe(catchErrors(mockSnackBar))
      .subscribe({
        next: () => {
          fail('should not emit');
          done();
        },
        error: () => {
          errorPropagated = true;
        },
        complete: () => {
        }
      });
    
    // NEVER doesn't complete, so after a tick we check nothing leaked
    setTimeout(() => {
      expect(errorPropagated).toBeFalse();
      done();
    }, 50);
  });
  
  it('should call SharedConstants.errorHandlerOperation on error', () => {
    const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    const handlerSpy = spyOn(SharedConstants, 'errorHandlerOperation').and.callFake(() => (src: any) => src);
    
    throwError(() => new Error('boom'))
      .pipe(catchErrors(mockSnackBar))
      .subscribe({
        next: () => {
        }, error: () => {
        }, complete: () => {
        }
      });
    
    expect(handlerSpy).toHaveBeenCalled();
  });
});

describe('supabase.cache - cacheBuster$ subject', () => {
  it('should be a Subject that can be subscribed to', () => {
    expect(typeof cacheBuster$.subscribe).toBe('function');
  });
  
  it('should multicast to multiple subscribers', (done) => {
    let count = 0;
    const s1 = cacheBuster$.subscribe(() => count++);
    const s2 = cacheBuster$.subscribe(() => count++);
    
    cacheBuster$.next(['modules']);
    
    setTimeout(() => {
      s1.unsubscribe();
      s2.unsubscribe();
      expect(count).toBeGreaterThanOrEqual(2);
      done();
    }, 30);
  });
});