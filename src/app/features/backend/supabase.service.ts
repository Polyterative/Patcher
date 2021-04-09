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
import { zmodules }      from '../../models/modulesdb';

@Injectable()
export class SupabaseService {
    
    user = {
        user$:   new ReplaySubject(),
        login$:  new EventEmitter<void>(),
        logout$: new EventEmitter<void>()
    };
    
    add = {
        euromodules: (data: DBEuroModule[]) => fromPromise(
          this.supabase
              .from('euroModules')
              .insert(data)
        ),
        manufacturers: (data: DBManufacturer[]) => fromPromise(
          this.supabase
              .from('manufacturers')
              .insert(data)
        )
    };
    get = {
        euromodules:   (from = 0, to: number = this.defaultPag) => fromPromise(
          this.supabase.from('euroModules')
              .select('*')
              .range(from, to)
        ),
        manufacturers: (from = 0, to = this.defaultPag) => fromPromise(
          this.supabase.from('manufacturers')
              .select('*')
              .range(from, to)
        )
    
    };
    delete = {
        euromodules:   (from = 0, to: number = this.defaultPag) => fromPromise(
          this.supabase.from('euroModules')
              .delete()
              .range(from, to)
        ),
        manufacturers: (from = 0, to = this.defaultPag) => fromPromise(
          this.supabase.from('manufacturers')
              .delete()
              .range(from, to)
        )
        
    };
    
    import = {
        manufacturers: (): void => {
            let items = zmodules.map(x => x.mkr)
                                .sort((a, b) => a.name.localeCompare(b.name));
    
            items = items.filter((a, index) => {
                const s = JSON.stringify(a);
                return index === items.findIndex(obj =>
                       JSON.stringify(obj) === s);
            });
    
            console.log(items);
    
            debugger;
    
            this.add.manufacturers(items)
                .subscribe(value => console.log(value));
    
        },
        modules:       (): void => {
            // let modules = zmodules.slice(45, allmodules.length - 1);
            const modules = zmodules.slice(0, 1000);
        
            this.get.manufacturers(0, 99999)
                .pipe(map(x => x.data))
                .subscribe(manifacturers => {
                    const toadd: DBEuroModule[] = [];
            
                    modules.forEach(module => {
                
                        const found = manifacturers.find(a => a.name == module.mkr.name);
                        if (module.hp != undefined) {
                            toadd.push(
                              {
                                  name:           module.name,
                                  manufacturerId: found ? found.id : '',
                                  hp:             module.hp,
                                  description:    '',
                                  ins:            JSON.stringify([]),
                                  outs:           JSON.stringify([]),
                                  switches:       JSON.stringify([]),
                                  manualURL:      '',
                                  created:        new Date().toISOString(),
                                  updated:        new Date().toISOString(),
                                  public:         false,
                                  additional:     JSON.stringify({})
                              }
                            );
                        }
    
    
                    });
                    console.log(toadd);
    
                    debugger;
            
                    this.add.euromodules(toadd)
                        .subscribe(value => console.log(value));
            
                });
        
            // this.add.euromodules();
        
        }
    };
    
    private defaultPag = 20;
    private supabase = createClient(environment.supabase.url, environment.supabase.key);
    
    constructor() {
        console.clear();
        
    }
    
}