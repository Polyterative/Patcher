import {
  EventEmitter,
  Injectable
}                          from '@angular/core';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { createClient }    from '@supabase/supabase-js';
import {
  ReplaySubject,
  throwError
}                          from 'rxjs';
import { fromPromise }     from 'rxjs/internal-compatibility';
import { of }              from 'rxjs/internal/observable/of';
import {
  map,
  switchMap,
  tap
}                          from 'rxjs/operators';
import { environment }     from '../../../environments/environment';
import {
  DBManufacturer,
  DbModule
}                          from '../../models/models';
import { SharedConstants } from '../../shared-interproject/SharedConstants';

@Injectable()
export class SupabaseService {
  user = {
    user$:   new ReplaySubject(),
    login$:  new EventEmitter<void>(),
    logout$: new EventEmitter<void>()
  };
  
  add = {
    userModule: (moduleId: number) => fromPromise(
      this.supabase
          .from(this.paths.user_modules)
          .insert({
            moduleid:  moduleId,
            profileid: this.getUser().id
          })
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    modules: (data: DbModule[]) => fromPromise(
      this.supabase
          .from(this.paths.modules)
          .insert(data)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    manufacturers: (data: DBManufacturer[]) => fromPromise(
      this.supabase
          .from(this.paths.manufacturers)
          .insert(data)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
  };
  get = {
    userModules:    () => fromPromise(
      this.supabase.from(this.paths.user_modules)
          .select('module:moduleid(*, manufacturer:manufacturerId(name,id,logo))')
          .filter('profileid', 'eq', this.getUser().id)
    )
      .pipe(map((value => value.data.map(y => y.module)))),
    modulesFull:    (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(`${ columns }, manufacturer:manufacturerId(name,id,logo)`)
          .range(from, to)
    ),
    modulesCount:   () => fromPromise(
      this.supabase.from(this.paths.modules)
          .select('id')
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar), map(value => value.data.length)),
    modulesMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string) => fromPromise(
      this.supabase.from(this.paths.modules)
          .select('id,name,hp,description,public,standard, manufacturer:manufacturerId(name,id,logo)', {count: 'exact'})
          .ilike('name', `%${ name }%`)
          .range(from, to)
          .order(orderBy ? orderBy : 'name')
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar)),
    moduleWithId:   (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(`${ columns }, manufacturer:manufacturerId(name)`)
          .range(from, to)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturerWithId: (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.manufacturers)
          .select(columns)
          .range(from, to)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturers:      (from = 0, to = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.manufacturers)
          .select(columns)
          .range(from, to)
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar)),
    userWithId:         (id: string, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(columns)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar))
  };
  delete = {
    userModule:    (id: number) => fromPromise(
      this.supabase.from(this.paths.user_modules)
          .delete()
          .filter('profileid', 'eq', this.getUser().id)
          .filter('moduleid', 'eq', id)
    ),
    modules:       (from = 0, to: number = this.defaultPag) => fromPromise(
      this.supabase.from(this.paths.modules)
          .delete()
          .range(from, to)
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturers: (from = 0, to = this.defaultPag) => fromPromise(
      this.supabase.from(this.paths.manufacturers)
          .delete()
          .range(from, to)
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar))
  };
  
  update = {
    module: (data: DbModule) => {
      data.manufacturer = undefined;
      return fromPromise(
        this.supabase.from(this.paths.modules)
            .update(data)
            .eq('id', data.id)
            .single()
      )
        .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    }
  };
  
  private paths = {
    modules:       'modules',
    manufacturers: 'manufacturers',
    user_modules:  'user_modules',
    profiles:      'profiles'
  };
  
  private defaultPag = 20;
  private supabase = createClient(environment.supabase.url, environment.supabase.key);
  
  login(email: string, password: string) {
    return fromPromise(this.supabase.auth.signIn({
      email,
      password
    }))
      .pipe(switchMap(x =>
        !x.error ? fromPromise(
          this.supabase
              .from(this.paths.profiles)
              .update({confirmed: true})
        )
          .pipe(map(z => x)) : of(x)));
  }
  
  signupGoogle() {
    return fromPromise(this.supabase.auth.signIn({
      provider: 'google'
    }));
  }
  
  signup(email: string, password: string) {
    return fromPromise(this.supabase.auth.signUp({
      email,
      password
    }));
  }
  
  getUser() {
    return this.supabase.auth.user();
  }
  
  logoff() {
    return this.supabase.auth.signOut();
  }
  
  constructor(public snackBar: MatSnackBar) {
    // console.clear();
    
  }
  
}
