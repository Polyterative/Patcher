import {
  EventEmitter,
  Injectable
}                          from '@angular/core';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { ActivatedRoute }  from '@angular/router';
import { createClient }    from '@supabase/supabase-js';
import {
  combineLatest,
  ReplaySubject,
  throwError
}                          from 'rxjs';
import { fromPromise }     from 'rxjs/internal-compatibility';
import { of }              from 'rxjs/internal/observable/of';
import {
  map,
  switchMap,
  tap,
  withLatestFrom
}                          from 'rxjs/operators';
import {
  CV,
  DBManufacturer,
  DbModule,
  Patch
}                          from 'src/app/models/models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { environment }     from 'src/environments/environment';

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
    rackModule: (moduleId: number, rackid: number) => fromPromise(
      this.supabase
          .from(this.paths.rack_modules)
          .insert({
            moduleid: moduleId,
            rackid:   rackid
          })
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    rack: (data: { name: string, authorid: string, rows: number, hp: number }) => {
      return fromPromise(
        this.supabase
            .from(this.paths.racks)
            .insert(data)
      )
        .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar));
    }
    ,
    patch: (data: Patch) => fromPromise(
      this.supabase
          .from(this.paths.patches)
          .insert(data)
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
    moduleINs: (data: CV[], moduleid: number) => fromPromise(
      this.supabase
          .from(this.paths.moduleINs)
          .insert(data.map(x => ({
            ...x,
            moduleid
          })))
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    moduleOUTs: (data: CV[], moduleid: number) => fromPromise(
      this.supabase
          .from(this.paths.moduleOUTs)
          .insert(data.map(x => ({
            ...x,
            moduleid
          })))
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
    userModules: () => fromPromise(
      this.supabase.from(this.paths.user_modules)
          .select(`module:moduleid(*, ${ this.queryJoins.manufacturer }, ${ this.queryJoins.insOuts })`)
          .filter('profileid', 'eq', this.getUser().id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data.map(y => y.module)))),
  
    patchConnections: (patchid: number) => fromPromise(
      this.supabase.from(this.paths.patch_connections)
        // .select(`module:moduleid(*, ${ this.queryJoins.manufacturer }, ${ this.queryJoins.insOuts })`)
        //   .select(`*,a(*,${ this.queryJoins.module })`)
        //   .select(`*,a(*,module:moduleid(*,manufacturer:manufacturerId(name,id,logo)))`)
          .select(`
          patch:patchid(*),
          a(*,module:moduleid(*, ${ this.queryJoins.manufacturer })),
          b(*,module:moduleid(*,${ this.queryJoins.manufacturer }))
          `)
          .filter('patchid', 'eq', patchid)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data)))
    ,
  
    // patches:            (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
    //   this.supabase.from(this.paths.patches)
    //       .select(`${ columns }`)
    //       .range(from, to)
    // ),
    patchesMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string) => fromPromise(
      this.supabase.from(this.paths.patches)
          .select(`id,name,created,updated,${ this.queryJoins.author } `, {count: 'exact'})
          .ilike('name', `%${ name }%`)
          .range(from, to)
          .order(orderBy ? orderBy : 'name')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    userPatches:    () => fromPromise(
      this.supabase.from(this.paths.patches)
          .select(`*, ${ this.queryJoins.author }`)
          .filter('authorid', 'eq', this.getUser().id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data))),
    userRacks:      () => fromPromise(
      this.supabase.from(this.paths.racks)
          .select(`*, ${ this.queryJoins.author }`)
          .filter('authorid', 'eq', this.getUser().id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data))),
    rackModules:    (rackid: number) => fromPromise(
      this.supabase.from(this.paths.rack_modules)
          .select(`${ this.queryJoins.module }`)
        // .select(`*`)
          .filter('rackid', 'eq', rackid)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data)), map(x => x.map(y => y.module))),
    modulesFull:    (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(`${ columns }, ${ this.queryJoins.manufacturer }, ${ this.queryJoins.insOuts }`)
          .range(from, to)
    ),
    modulesCount:   () => fromPromise(
      this.supabase.from(this.paths.modules)
          .select('id')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar), map(x => x.data.length)),
    modulesMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string) => fromPromise(
      this.supabase.from(this.paths.modules)
          .select('id,name,hp,description,public,standard, manufacturer:manufacturerId(name,id,logo)', {count: 'exact'})
          .ilike('name', `%${ name }%`)
          .range(from, to)
          .order(orderBy ? orderBy : 'name')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    racksMinimal:   (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string) => fromPromise(
      this.supabase.from(this.paths.racks)
          .select(`*,${ this.queryJoins.author }`, {count: 'exact'})
          .ilike(`name,hp,rows, ${ this.queryJoins.author }`, `%${ name }%`)
          .range(from, to)
          .order(orderBy ? orderBy : 'name')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
  
    moduleWithId:       (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(`${ columns }, manufacturer:manufacturerId(name), ${ this.queryJoins.insOuts }`)
          .range(from, to)
          .filter('id', 'eq', id)
          .order('id', {foreignTable: this.paths.moduleINs})
          .order('id', {foreignTable: this.paths.moduleOUTs})
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    patchWithId:        (id: number, columns = '*') => fromPromise(
      this.supabase.from(this.paths.patches)
        // .select(`${ columns }, manufacturer:manufacturerId(name), ${ this.queryJoins.insOuts }`)
          .select(`${ columns }, ${ this.queryJoins.author }`)
        // .range(from, to)
          .filter('id', 'eq', id)
        // .order('id', {foreignTable: this.paths.moduleINs})
        // .order('id', {foreignTable: this.paths.moduleOUTs})
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    rackWithId:         (id: number, columns = '*') => fromPromise(
      this.supabase.from(this.paths.racks)
        // .select(`${ columns }, manufacturer:manufacturerId(name), ${ this.queryJoins.insOuts }`)
          .select(`${ columns }, ${ this.queryJoins.author }`)
        // .range(from, to)
          .filter('id', 'eq', id)
        // .order('id', {foreignTable: this.paths.moduleINs})
        // .order('id', {foreignTable: this.paths.moduleOUTs})
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturerWithId: (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.manufacturers)
          .select(columns)
          .range(from, to)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturers:      (from = 0, to = this.defaultPag, columns = '*') => fromPromise(
      this.supabase.from(this.paths.manufacturers)
          .select(columns)
          .range(from, to)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    userWithId:         (id: string, columns = '*') => fromPromise(
      this.supabase.from(this.paths.modules)
          .select(columns)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
  };
  delete = {
    userModule: (id: number) => fromPromise(
      this.supabase.from(this.paths.user_modules)
          .delete()
          .filter('profileid', 'eq', this.getUser().id)
          .filter('moduleid', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    userPatch: (id: number) => fromPromise(
      this.supabase.from(this.paths.patches)
          .delete()
          .filter('authorid', 'eq', this.getUser().id)
          .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    userRack: (id: number) => fromPromise(
      this.supabase.from(this.paths.racks)
          .delete()
          .filter('authorid', 'eq', this.getUser().id)
          .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    modules:       (from = 0, to: number = this.defaultPag) => fromPromise(
      this.supabase.from(this.paths.modules)
          .delete()
          .range(from, to)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturers: (from = 0, to = this.defaultPag) => fromPromise(
      this.supabase.from(this.paths.manufacturers)
          .delete()
          .range(from, to)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
  };
  
  update = {
    module:        (data: DbModule) => {
      data.manufacturer = undefined;
      data.ins = undefined;
      data.outs = undefined;
      return fromPromise(
        this.supabase.from(this.paths.modules)
            .update(data)
            .eq('id', data.id)
            .single()
      )
        .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    moduleINsOUTs: (data: DbModule) => combineLatest(
      [
        this.buildCVInserter(data.ins, this.paths.moduleINs, data.id),
        this.buildCVUpdater(data.ins, this.paths.moduleINs, data.id),
        this.buildCVInserter(data.outs, this.paths.moduleOUTs, data.id),
        this.buildCVUpdater(data.outs, this.paths.moduleOUTs, data.id)
      ]
    )
      .pipe(tap(x => {SharedConstants.showSuccessUpdate(this.snackBar); }))
  };
  
  private paths = {
    modules:           'modules',
    moduleINs:         'module_ins',
    moduleOUTs:        'module_outs',
    manufacturers:     'manufacturers',
    user_modules:      'user_modules',
    racks:             'racks',
    rack_modules:      'rack_modules',
    patches:           'patches',
    patch_connections: 'patch_connections',
    profiles:          'profiles'
  };
  
  private defaultPag = 20;
  private supabase = createClient(environment.supabase.url, environment.supabase.key);
  
  private queryJoins = {
    manufacturer: 'manufacturer:manufacturerId(name,id,logo)',
    author:       'author:authorid(username,id,email)',
    rack_modules: 'rackModules:rackid(*)',
    module:       `module:moduleid(*,manufacturer:manufacturerId(name,id,logo))`,
    ins:          `ins:${ this.paths.moduleINs }(*)`,
    outs:         `outs:${ this.paths.moduleOUTs }(*)`,
    insOuts:      `ins:${ this.paths.moduleINs }(*), outs:${ this.paths.moduleOUTs }(*)`
  };
  
  login(email: string, password: string) {
    const params$ = of('')
      .pipe(withLatestFrom(this.activated.queryParams), map(([x, data]) => data));
    
    return fromPromise(this.supabase.auth.signIn({
      email,
      password
    }))
      .pipe(
        switchMap(x => !x.error ? fromPromise(
          this.supabase
              .from(this.paths.profiles)
              .update({confirmed: true})
          )
            .pipe(map(z => x)) : of(x)
        ),
        withLatestFrom(params$),
        map(([x, y]) => ({
          ...x,
          returnUrl: y.returnUrl
        }))
      )
      ;
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
  
  constructor(
    public activated: ActivatedRoute,
    public snackBar: MatSnackBar
  ) {
    // console.clear();
    
  }
  
  private buildCVInserter(cvs: CV[], path: string, moduleId: number) {
    
    return combineLatest(
      cvs.map(this.getCvMapper(moduleId))
         .filter(x => x.id == 0)
         .map(x => {
           x.id = undefined;
           return x;
         })
         .map(cv => fromPromise(
           this.supabase.from(path)
               .insert(cv)
               .select('id')
         ))
    );
  }
  
  private getCvMapper(moduleId: number) {
    const mapper: (cv) => { min: number; id: number; max: number; name: string; moduleId: number } = (roq: CV) => ({
      max:  roq.max,
      min:  roq.min,
      name: roq.name,
      // id:       roq.id > 0 ? roq.id : undefined, //fix this
      id: roq.id,
      moduleId
    });
    return mapper;
  }
  
  private buildCVUpdater(cvs: CV[], path: string, moduleId: number) {
    return combineLatest(
      cvs.map(this.getCvMapper(moduleId))
         .filter(x => x.id > 0)
         .map(cv => fromPromise(
           this.supabase.from(path)
               .update(cv)
               .eq('id', cv.id)
               .select('id')
         ))
    );
  }
  
}
