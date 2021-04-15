import {
  EventEmitter,
  Injectable
}                          from '@angular/core';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { createClient }    from '@supabase/supabase-js';
import { ReplaySubject }   from 'rxjs';
import { fromPromise }     from 'rxjs/internal-compatibility';
import {
  map,
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
    manufacturers: 'manufacturers'
  };
  
  login(email: string, password: string) {
    return fromPromise(this.supabase.auth.signIn({
      email,
      password
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
  
  // import = {
  //     manufacturers: (): void => {
  //         let items = zmodules.map(x => x.mkr)
  //                             .sort((a, b) => a.name.localeCompare(b.name));
  //
  //         items = items.filter((a, index) => {
  //             const s = JSON.stringify(a);
  //             return index === items.findIndex(obj =>
  //                    JSON.stringify(obj) === s);
  //         });
  //
  //         console.log(items);
  //
  //         debugger;
  //
  //         this.add.manufacturers(items)
  //             .subscribe(value => console.log(value));
  //
  //     },
  //     modules:       (): void => {
  //         // let modules = zmodules.slice(45, allmodules.length - 1);
  //         const modules = zmodules.slice(0, 1000);
  //
  //         this.get.manufacturers(0, 99999, '*')
  //             .pipe(map(x => x.data))
  //             .subscribe(manifacturers => {
  //                 const toadd: DbModule[] = [];
  //
  //                 modules.forEach(module => {
  //
  //                     const found = manifacturers.find(a => a.name == module.mkr.name);
  //                     if (module.hp != undefined) {
  //                         toadd.push(
  //                           {
  //                               name:           module.name,
  //                               manufacturerId: found ? found.id : '',
  //                               hp:             module.hp,
  //                               description:    '',
  //                               ins:            JSON.stringify([]),
  //                               outs:           JSON.stringify([]),
  //                               switches:       JSON.stringify([]),
  //                               manualURL:      '',
  //                               created:        new Date().toISOString(),
  //                               updated:        new Date().toISOString(),
  //                               public:         false,
  //                               additional:     JSON.stringify({})
  //                           }
  //                         );
  //                     }
  //
  //                 });
  //                 console.log(toadd);
  //
  //                 debugger;
  //
  //                 this.add.modules(toadd)
  //                     .subscribe(value => console.log(value));
  //
  //             });
  //
  //         // this.add.modules();
  //
  //     }
  // };
  
  private defaultPag = 20;
  private supabase = createClient(environment.supabase.url, environment.supabase.key);
  
  constructor(public snackBar: MatSnackBar) {
    console.clear();
    
  }
  
}
