import {
  EventEmitter,
  Injectable
}                          from '@angular/core';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { createClient }    from '@supabase/supabase-js';
import { ReplaySubject }   from 'rxjs';
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
    modules: (data: DbModule[]) => fromPromise(
      this.supabase
          .from(this.paths.modules)
          .insert(data)
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    manufacturers: (data: DBManufacturer[]) => fromPromise(
      this.supabase
          .from(this.paths.manufacturers)
          .insert(data)
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar))
  };
  get = {
    modulesFull:        (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(`${ columns }, manufacturer:manufacturerId(name,id,logo)`)
          .range(from, to)
    ),
    modulesCount:       () => fromPromise(
      this.supabase.from(this.paths.modules)
          .select('id')
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar), map(value => value.data.length)),
    modulesMinimal:     (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string) => fromPromise(
      this.supabase.from(this.paths.modules)
          .select('id,name,hp,description,public,standard, manufacturer:manufacturerId(name,id,logo)')
        // .textSearch('name', name)
          .range(from, to)
          .order(orderBy ? orderBy : 'name')
    )
      .pipe(SharedConstants.errorHandlerOperation(this.snackBar)),
    moduleWithId:       (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
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
    profiles:      'profiles'
  };
  
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
  
  private defaultPag = 20;
  private supabase = createClient(environment.supabase.url, environment.supabase.key);
  
  constructor(public snackBar: MatSnackBar) {
    // console.clear();
    
  }
  
}
