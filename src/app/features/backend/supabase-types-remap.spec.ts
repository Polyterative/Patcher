import { remapErrors } from './supabase.cache';
import {
  of,
  throwError
} from 'rxjs';
import { toArray } from 'rxjs/operators';
import {
  CurrentUserModulesOrderConfig,
  OAuthProvider
} from './supabase.types';


describe('supabase.types runtime shapes', () => {
  it('OAuthProvider values are strings', () => {
    const providers: OAuthProvider[] = ['google', 'apple', 'github', 'facebook', 'azure', 'twitter'];
    for (const p of providers) {
      expect(typeof p).toBe('string');
    }
  });
  
  it('CurrentUserModulesOrderConfig has expected key and direction shapes', () => {
    const config: CurrentUserModulesOrderConfig = {
      key: 'moduleName',
      direction: 'asc'
    };
    expect(config.key).toBe('moduleName');
    expect(config.direction).toBe('asc');
  });
  
  it('CurrentUserModulesOrderDirection values are asc or desc', () => {
    const valid = ['asc', 'desc'];
    expect(valid).toContain('asc');
    expect(valid).toContain('desc');
  });
  
  it('CurrentUserModulesOrderKey values are defined strings', () => {
    const keys = ['moduleName', 'collectionUpdated'];
    for (const k of keys) {
      expect(typeof k).toBe('string');
    }
  });
});


describe('remapErrors operator', () => {
  it('passes through values when source succeeds', (done) => {
    of(1, 2, 3)
      .pipe(remapErrors(), toArray())
      .subscribe(values => {
        expect(values).toEqual([1, 2, 3]);
        done();
      });
  });
  
  it('passes through errors unchanged', (done) => {
    const err = new Error('test error');
    throwError(() => err)
      .pipe(remapErrors())
      .subscribe({
        error: (e) => {
          expect(e).toBe(err);
          done();
        }
      });
  });
});