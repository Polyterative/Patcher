import {
    EventEmitter,
    Injectable
}                        from '@angular/core';
import { createClient }  from '@supabase/supabase-js';
import { ReplaySubject } from 'rxjs';
import { fromPromise }   from 'rxjs/internal-compatibility';
import { map }           from 'rxjs/operators';
import { environment }   from '../../../environments/environment';
import {
    DBEuroModule,
    DBManufacturer
}                        from '../../models/models';

@Injectable()
export class SupabaseService {
    
    private paths = {
        euromodules:   'euroModules',
        manufacturers: 'manufacturers'
    };
    user = {
        user$:   new ReplaySubject(),
        login$:  new EventEmitter<void>(),
        logout$: new EventEmitter<void>()
    };
    
    add = {
        euromodules:   (data: DBEuroModule[]) => fromPromise(
          this.supabase
              .from(this.paths.euromodules)
              .insert(data)
        ),
        manufacturers: (data: DBManufacturer[]) => fromPromise(
          this.supabase
              .from(this.paths.manufacturers)
              .insert(data)
        )
    };
    get = {
        euromodulesFull:    (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
          this.supabase.from(this.paths.euromodules)
              .select(`${ columns }, manufacturer:manufacturerId(name,id,logo)`)
              .range(from, to)
        ),
        euromodulesCount:   () => fromPromise(
          this.supabase.from(this.paths.euromodules)
              .select(`id`)
        )
        .pipe(map(value => value.data.length)),
        euromodulesMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string) => fromPromise(
          this.supabase.from(this.paths.euromodules)
              .select(`id,name,hp,public, manufacturer:manufacturerId(name,id,logo)`)
          // .textSearch('name', name)
              .range(from, to)
              .order(orderBy ? orderBy : 'name')
        ),
        euromoduleWithId:   (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
          this.supabase.from(this.paths.euromodules)
              .select(`${ columns }, manufacturer:manufacturerId(name)`)
              .range(from, to)
              .filter('id', 'eq', id)
              .single()
        ),
        manufacturerWithId: (id: number, from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
          this.supabase.from(this.paths.manufacturers)
              .select(columns)
              .range(from, to)
              .filter('id', 'eq', id)
              .single()
        ),
        manufacturers:      (from = 0, to = this.defaultPag, columns = '*') => fromPromise(
          this.supabase.from(this.paths.manufacturers)
              .select(columns)
              .range(from, to)
        )
    };
    delete = {
        euromodules:   (from = 0, to: number = this.defaultPag) => fromPromise(
          this.supabase.from(this.paths.euromodules)
              .delete()
              .range(from, to)
        ),
        manufacturers: (from = 0, to = this.defaultPag) => fromPromise(
          this.supabase.from(this.paths.manufacturers)
              .delete()
              .range(from, to)
        )
    
    };
    
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
    //                 const toadd: DBEuroModule[] = [];
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
    //                 this.add.euromodules(toadd)
    //                     .subscribe(value => console.log(value));
    //
    //             });
    //
    //         // this.add.euromodules();
    //
    //     }
    // };
    
    private defaultPag = 20;
    private supabase = createClient(environment.supabase.url, environment.supabase.key);
    
    constructor() {
        console.clear();
        
    }
    
}