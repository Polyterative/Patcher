import {
  of,
  throwError
} from 'rxjs';
import {
  cacheBust,
  cacheBuster$,
  defaultCacheTime,
  longCacheTime,
  showSuccessMessage,
  smallCacheTime
} from './supabase.cache';


describe('supabase.cache constants', () => {
  it('smallCacheTime is one fifth of defaultCacheTime', () => {
    expect(smallCacheTime).toBe(defaultCacheTime / 5);
  });
  
  it('longCacheTime is ten times defaultCacheTime', () => {
    expect(longCacheTime).toBe(defaultCacheTime * 10);
  });
  
  it('defaultCacheTime is 5 minutes in milliseconds', () => {
    expect(defaultCacheTime).toBe(5 * 60 * 1000);
  });
});


describe('cacheBust operator', () => {
  it('passes through source values unchanged', (done) => {
    of(42)
      .pipe(cacheBust(['modules']))
      .subscribe(value => {
        expect(value).toBe(42);
        done();
      });
  });
  
  it('emits on cacheBuster$ with the provided keys when source emits', (done) => {
    const keys: any[] = [];
    const sub = cacheBuster$.subscribe(k => keys.push(k));
    
    of('data')
      .pipe(cacheBust(['manufacturers']))
      .subscribe({
        complete: () => {
          sub.unsubscribe();
          expect(keys.length).toBeGreaterThan(0);
          expect(keys[keys.length - 1]).toEqual(['manufacturers']);
          done();
        }
      });
  });
  
  it('handles an empty keys array', (done) => {
    of(1)
      .pipe(cacheBust([]))
      .subscribe(v => {
        expect(v).toBe(1);
        done();
      });
  });
});


describe('showSuccessMessage operator', () => {
  it('passes through source values unchanged', (done) => {
    const snackBar: any = {open: jasmine.createSpy('open').and.returnValue({onAction: () => of()})};
    
    of('response')
      .pipe(showSuccessMessage(snackBar))
      .subscribe(v => {
        expect(v).toBe('response');
        done();
      });
  });
  
  it('calls snackBar.open when source emits', (done) => {
    const snackBar: any = {open: jasmine.createSpy('open').and.returnValue({onAction: () => of()})};
    
    of(true)
      .pipe(showSuccessMessage(snackBar))
      .subscribe({
        complete: () => {
          expect(snackBar.open).toHaveBeenCalled();
          done();
        }
      });
  });
  
  it('does not call snackBar.open when source errors', (done) => {
    const snackBar: any = {open: jasmine.createSpy('open')};
    
    throwError(() => new Error('boom'))
      .pipe(showSuccessMessage(snackBar))
      .subscribe({
        error: () => {
          expect(snackBar.open).not.toHaveBeenCalled();
          done();
        }
      });
  });
});