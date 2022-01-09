import {
  EventEmitter,
  Injectable
}                          from '@angular/core';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { ActivatedRoute }  from '@angular/router';
import { createClient }    from '@supabase/supabase-js';
import {
  forkJoin,
  from as rxFrom,
  of,
  ReplaySubject,
  throwError,
  zip
}                          from 'rxjs';
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
  Patch,
  PatchConnection,
  RackedModule,
  RackMinimal
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
    userModule: (moduleId: number) => rxFrom(
      this.supabase
          .from(this.paths.user_modules)
          .insert({
            moduleid:  moduleId,
            profileid: this.getUser().id
          })
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    rackModule: (moduleId: number, rackid: number) => rxFrom(
      this.supabase
          .from(this.paths.rack_modules)
          .insert({
            moduleid: moduleId,
            rackid
          })
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    rack: (data: { name: string, authorid: string, rows: number, hp: number, locked: boolean }) =>
            rxFrom(
              this.supabase
                  .from(this.paths.racks)
                  .insert(data)
            )
              .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    patch: (data: { name: string }) => rxFrom(
      this.supabase
          .from(this.paths.patches)
          .insert({
            ...data,
            authorid: this.getUser().id
          })
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    modules: (data: DbModule[]) => rxFrom(
      this.supabase
          .from(this.paths.modules)
          .insert(data)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    moduleINs: (data: CV[], moduleid: number) => rxFrom(
      this.supabase
          .from(this.paths.moduleINs)
          .insert(data.map(x => ({
            ...x,
            moduleid
          })))
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    moduleOUTs: (data: CV[], moduleid: number) => rxFrom(
      this.supabase
          .from(this.paths.moduleOUTs)
          .insert(data.map(x => ({
            ...x,
            moduleid
          })))
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    manufacturers: (data: Partial<DBManufacturer>[]) => rxFrom(
      this.supabase
          .from(this.paths.manufacturers)
          .insert(data)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
  };
  get = {
    userModules:      () => rxFrom(
      this.supabase.from(this.paths.user_modules)
          .select(`module:moduleid(*, ${ this.queryJoins.manufacturer }, ${ this.queryJoins.insOuts })`)
          .filter('profileid', 'eq', this.getUser().id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data.map(y => y.module)))),
    patchConnections: (patchid: number) => rxFrom(
      this.supabase.from(this.paths.patch_connections)
        // .select(`module:moduleid(*, ${ this.queryJoins.manufacturer }, ${ this.queryJoins.insOuts })`)
        //   .select(`*,a(*,${ this.queryJoins.module })`)
        //   .select(`*,a(*,module:moduleid(*,manufacturer:manufacturerId(name,id,logo)))`)
          .select(`
          *,
          patch:patchid(*),
          a(*,module:moduleid(*, ${ this.queryJoins.manufacturer })),
          b(*,module:moduleid(*,${ this.queryJoins.manufacturer }))
          `)
          .filter('patchid', 'eq', patchid)
          .order('ordinal')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data)))
    ,
  
    // patches:            (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
    //   this.supabase.from(this.paths.patches)
    //       .select(`${ columns }`)
    //       .range(from, to)
    // ),
    patchesMinimal:    (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string, orderDirection?: string) => rxFrom(
      this.supabase.from(this.paths.patches)
          .select(`id,name,description,${ this.queryJoins.author } `, {count: 'exact'})
          .ilike('name', `%${ name }%`)
          .range(from, to)
          .order(orderBy ? orderBy : 'name', {ascending: orderDirection == 'asc'})
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    userPatches:       () => rxFrom(
      this.supabase.from(this.paths.patches)
          .select(`*, ${ this.queryJoins.author }`)
          .filter('authorid', 'eq', this.getUser().id)
          .order('updated', {ascending: false})
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data))),
    userRacks:         () => rxFrom(
      this.supabase.from(this.paths.racks)
          .select(`*, ${ this.queryJoins.author }`)
          .filter('authorid', 'eq', this.getUser().id)
          .order('updated', {ascending: false})
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data))),
    rackedModules:     (rackid: number) => rxFrom(
      this.supabase.from(this.paths.rack_modules)
          .select(`*, ${ this.queryJoins.module }`)
        // .order('module.id')
        // .select(`*`)
          .filter('rackid', 'eq', rackid)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data)), map(x => x.map(y => ({
        module:      y.module,
        rackingData: {
          id:       y.id,
          row:      y.row,
          column:   y.column,
          moduleid: y.moduleid,
          rackid:   y.rackid
        }
      })))),
    modulesFull:       (from = 0, to: number = this.defaultPag, columns = '*') => rxFrom(
      this.supabase.from(this.paths.modules)
          .select(`${ columns },
          ${ this.queryJoins.manufacturer },
          ${ this.queryJoins.insOuts },
          ${ this.queryJoins.module_tags }
`)
          .range(from, to)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data))),
    modulesMinimal:    (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string, orderDirection?: string, manufacturerId?: number) => {
      const baseQuery = this.supabase.from(this.paths.modules)
                            .select('id,name,hp,description,public,standard,manufacturer:manufacturerId(name,id,logo)', {count: 'exact'})
                            .ilike('name', `%${ name }%`)
                            .filter('public', 'eq', true)
                            .range(from, to)
                            .order(orderBy ? orderBy : 'name', {ascending: orderDirection == 'asc'});
      return rxFrom(
        manufacturerId ? baseQuery.eq('manufacturerId', manufacturerId) :
        baseQuery
      )
        .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar));
    },
    racksMinimal:      (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string, orderDirection?: string) => rxFrom(
      this.supabase.from(this.paths.racks)
          .select(`id,name,hp,rows,description,authorid,${ this.queryJoins.author }`, {count: 'exact'})
          .ilike(`name,hp,rows, ${ this.queryJoins.author }`, `%${ name }%`)
          .range(from, to)
          .order(orderBy ? orderBy : 'name', {ascending: orderDirection == 'asc'})
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    moduleWithId:      (id: number, columns = '*') => rxFrom(
      this.supabase.from(this.paths.modules)
          .select(`${ columns },
           ${ this.queryJoins.manufacturer },
            ${ this.queryJoins.insOuts },
            ${ this.queryJoins.module_tags }
            `)
          .filter('id', 'eq', id)
          .order('id', {foreignTable: this.paths.moduleINs})
          .order('id', {foreignTable: this.paths.moduleOUTs})
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    patchWithId:        (id: number, columns = '*') => rxFrom(
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
    patcherWithModule: (moduleid: number) => rxFrom(
      this.supabase.from(this.paths.moduleOUTs)
      // this is hard
  
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
      .pipe(map((x => x.data))),
    rackWithId:         (id: number, columns = '*') => rxFrom(
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
    manufacturerWithId: (id: number, from = 0, to: number = this.defaultPag, columns = '*') => rxFrom(
      this.supabase.from(this.paths.manufacturers)
          .select(columns)
          .range(from, to)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturers:      (from = 0, to = this.defaultPag, columns = '*', orderBy?: string) => rxFrom(
      this.supabase.from(this.paths.manufacturers)
          .select(columns)
          .range(from, to)
          .order(orderBy ? orderBy : 'name')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    userWithId:         (id: string, columns = '*') => rxFrom(
      this.supabase.from(this.paths.profiles)
          .select(columns)
          .filter('id', 'eq', id)
          .single()
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    statistics:         () => zip(
      rxFrom(
        this.supabase.from(this.paths.modules)
            .select('id', {count: 'exact'})
      )
        .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        this.supabase.from(this.paths.racks)
            .select('id', {count: 'exact'})
      )
        .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        this.supabase.from(this.paths.patches)
            .select('id', {count: 'exact'})
      )
        .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
        .pipe(map(((x: any) => x.count)))
    )
    
  };
  delete = {
    userModule: (id: number) => rxFrom(
      this.supabase.from(this.paths.user_modules)
          .delete()
          .filter('profileid', 'eq', this.getUser().id)
          .filter('moduleid', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    rackedModule: (id: number) => rxFrom(
      this.supabase.from(this.paths.rack_modules)
          .delete()
          .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    modulesOfRack: (rackId: number) => rxFrom(
      this.supabase.from(this.paths.rack_modules)
          .delete()
          .filter('rackid', 'eq', rackId)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    patch: (id: number) => rxFrom(
      this.supabase.from(this.paths.patches)
          .delete()
        // .filter('profileid', 'eq', this.getUser().id)
          .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    patchConnectionsForPatch: (id: number) => rxFrom(
      this.supabase.from(this.paths.patch_connections)
          .delete()
          .filter('patchid', 'eq', id)
      // .filter('moduleid', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    userPatch: (id: number) => rxFrom(
      this.supabase.from(this.paths.patches)
          .delete()
          .filter('authorid', 'eq', this.getUser().id)
          .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    userRack: (id: number) => rxFrom(
      this.supabase.from(this.paths.racks)
          .delete()
          .filter('authorid', 'eq', this.getUser().id)
          .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar))
    ,
    modules:       (from = 0, to: number = this.defaultPag) => rxFrom(
      this.supabase.from(this.paths.modules)
          .delete()
          .range(from, to)
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)),
    manufacturers: (from = 0, to = this.defaultPag) => rxFrom(
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
      return rxFrom(
        this.supabase.from(this.paths.modules)
            .update(data)
            .eq('id', data.id)
            .single()
      )
        .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    rackedModules: (data: RackedModule[]) => {
      return rxFrom(
        this.supabase.from(this.paths.rack_modules)
            .upsert(data.filter(x => x.rackingData.id != undefined)
                        .map(rackedModule => rackedModule.rackingData))
      )
        .pipe(
          // insert where id is undefined
          switchMap(x => {
            let newRackedModules = data.filter(x => x.rackingData.id === undefined)
                                       .map(rackedModule => rackedModule.rackingData);
            let insertNew = rxFrom(
              this.supabase.from(this.paths.rack_modules)
                  .upsert(newRackedModules)
            );
            // call database for insert if there is any to insert
            return newRackedModules.length > 0 ? insertNew : of(x);
          })
        );
      // .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    rack:          (data: RackMinimal) => {
      return rxFrom(
        this.supabase.from(this.paths.racks)
            .upsert({
              id:          data.id,
              authorid:    data.author.id,
              name:        data.name,
              description: data.description,
              rows:        data.rows,
              hp:          data.hp,
              locked:      data.locked
            })
      );
      // .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    patch:         (data: Patch) => {
      data.author = undefined;
    
      return rxFrom(
        this.supabase.from(this.paths.patches)
            .update(data)
            .eq('id', data.id)
            .single()
      )
        .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    modules:       (data: DbModule[]) => {
      for (const datum of data) {
        datum.manufacturer = undefined;
        datum.ins = undefined;
        datum.outs = undefined;
        datum.created = undefined;
        datum.updated = undefined;
        datum.manualURL = undefined;
      }
      return rxFrom(
        this.supabase.from(this.paths.modules)
            .update(data)
      )
        .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    moduleINsOUTs: (data: DbModule) => forkJoin(
      [
        this.buildCVInserter(data.ins, this.paths.moduleINs, data.id),
        this.buildCVUpdater(data.ins, this.paths.moduleINs, data.id),
        this.buildCVInserter(data.outs, this.paths.moduleOUTs, data.id),
        this.buildCVUpdater(data.outs, this.paths.moduleOUTs, data.id)
      ]
    )
      .pipe(
        tap(x => {
          SharedConstants.showSuccessUpdate(this.snackBar);
        })),
    patchConnections: (data: PatchConnection[]) => this.buildPatchConnectionInserter(data)
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
    module_tags:       'module_tags',
    tags:              'tags',
    profiles:          'profiles'
  };
  
  private defaultPag = 20;
  private supabase = createClient(environment.supabase.url, environment.supabase.key);
  
  private queryJoins = {
    // simple synthax: responseObjectName:tableName(*columns*)
    // advanced synthax: responseObjectName:tableName(*columns*,responseObjectName:tableName(*columns*))
    manufacturer: 'manufacturer:manufacturerId(name,id,logo)',
    author:       'author:authorid(username,id,email)',
    rack_modules: 'rackModules:rackid(*)',
    module:       'module:moduleid(*,manufacturer:manufacturerId(name,id,logo))',
    module_tags:  `tags:${ this.paths.module_tags }(tag:${ this.paths.tags }(*))`,
    ins:          `ins:${ this.paths.moduleINs }(*)`,
    outs:         `outs:${ this.paths.moduleOUTs }(*)`,
    insOuts:      `ins:${ this.paths.moduleINs }(*), outs:${ this.paths.moduleOUTs }(*)`
  };
  
  login(email: string, password: string) {
    const params$ = of('')
      .pipe(withLatestFrom(this.activated.queryParams), map(([x, data]) => data));
  
    return rxFrom(this.supabase.auth.signIn({
      email,
      password
    }))
      .pipe(
        switchMap(x => !x.error ? rxFrom(
            this.supabase
                .from(this.paths.profiles)
                .update({
                  confirmed: true
                })
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
    return rxFrom(this.supabase.auth.signIn({
      provider: 'google'
    }));
  }
  
  signup(username: string, email: string, password: string) {
    return rxFrom(this.supabase.auth.signUp({
      email,
      password
    }))
      .pipe(switchMap(x => !x.error ? this.updateUserProfile(email, password, username) : of(x)));
  }
  
  // logs in, updates profile, logs out
  private updateUserProfile(email: string, password: string, username: string) {
    return this.login(email, password)
               .pipe(
                 switchMap(x => rxFrom(
                     this.supabase
                         .from(this.paths.profiles)
                         .update({
                           confirmed: true,
                           username
                         })
                         .eq('id', x.user.id)
                   )
                     .pipe(
                       map(z => x),
                       switchMap(x => rxFrom(this.supabase.auth.signOut())
                         .pipe(map(z => x)))
                     )
                 )
               );
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
    const mappedCVs = cvs.map(this.getCvMapper(moduleId))
                         .filter(x => x.id == 0)
                         .map(x => {
                           x.id = undefined;
                           return x;
                         });
    return rxFrom(
      this.supabase.from(path)
          .upsert(mappedCVs)
    )
      .pipe(
        // take(1),
        switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)
      );
  }
  
  private buildPatchConnectionInserter(connections: PatchConnection[]) {
  
    const toInsert = connections.map((conn, i) => ({
      patchid: conn.patch.id,
      a:       conn.a.id,
      b:       conn.b.id,
      notes:   conn.notes,
      ordinal: i
    }));
  
    const inserter$ = rxFrom(
      this.supabase.from(this.paths.patch_connections)
          .insert(toInsert)
          .select('patchid')
    )
      .pipe(switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar));
  
    if (connections.length > 0) {
      return this.delete.patchConnectionsForPatch(connections[0].patch.id)
                 .pipe(
                   switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar),
                   switchMap(x => inserter$)
                 );
    }
  
    return inserter$;
  }
  
  private getCvMapper(moduleid: number) {
    const mapper: (cv) => { min: number; id: number; max: number; name: string; moduleid: number } = (roq: CV) => ({
      max:  roq.max,
      min:  roq.min,
      name: roq.name,
      // id:       roq.id > 0 ? roq.id : undefined, //fix this
      id: roq.id,
      moduleid
    });
    return mapper;
  }
  
  private buildCVUpdater(cvs: CV[], path: string, moduleId: number) {
    const mappedCVs = cvs.map(this.getCvMapper(moduleId))
                         .filter(x => x.id > 0);
    return rxFrom(
      this.supabase.from(path)
          .upsert(mappedCVs)
    )
      .pipe(
        switchMap(x => (!!x.error ? throwError(new Error()) : of(x))), SharedConstants.errorHandlerOperation(this.snackBar)
      );
  }
  
}
