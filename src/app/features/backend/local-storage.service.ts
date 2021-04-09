import { Injectable } from '@angular/core';
import { StorageMap } from '@ngx-pwa/local-storage';
import { DateTime }   from 'luxon';
import {
    combineLatest,
    ReplaySubject,
    Subject
}                     from 'rxjs';
import {
    map,
    switchMap
}                     from 'rxjs/operators';
import {
    LocalEuroModule,
    LocalManufacturer
}                     from '../../models/models';
import {
    FirebaseService,
    paths
}                     from './firebase.service';

@Injectable()
export class LocalStorageService {
    allModules$ = new ReplaySubject<LocalEuroModule[]>();
    allManufacturers$ = new ReplaySubject<LocalManufacturer[]>();
    lastUpdated$ = new ReplaySubject<string>();
    
    downloadFromDB$ = new Subject();
    
    update = {
        euromodules:   (data: LocalEuroModule[]) => this.storage.set(paths.euromodules, data),
        manufacturers: (data: LocalManufacturer[]) => this.storage.set(paths.manufacturers, data)
    };
    
    // https://github.com/cyrilletuzi/angular-async-local-storage
    constructor(private storage: StorageMap, private backend: FirebaseService) {
        
        storage.get(paths.euromodules)
               .subscribe((data: LocalEuroModule[]) => this.allModules$.next(data));
        
        storage.get(paths.manufacturers)
               .subscribe((data: LocalManufacturer[]) => this.allManufacturers$.next(data));
        
        storage.get('lastUpdated')
               .subscribe((data: string) => { this.lastUpdated$.next(data); });
    
        this.downloadFromDB$.pipe(switchMap(x => combineLatest([
            backend.get.euromodulesPublic(),
            backend.get.manufacturers()
        ])))
            .subscribe(([x, y]) => {
                console.log('downloading From DB...');
                storage.set(paths.euromodules, x)
                       .subscribe();
                storage.set(paths.manufacturers, y)
                       .subscribe();
            });
    
        this.lastUpdated$.subscribe((x: string | undefined) => {
            if (x && DateTime.fromISO(x)
                             .diffNow('day')
                             .as('day') > -1) {
                console.log(`last updated: ${ DateTime.fromISO(x)
                                                      .toLocaleString(DateTime.DATETIME_FULL) }`);
                console.log(DateTime.fromISO(x)
                                    .diffNow()
                                    .as('day'));
            } else {
                this.downloadFromDB$.next();
                this.updateLastUpdated();
            }
        
        });
    
        // every 10 mins
        // interval(1000 * 60 * 10)
        // interval(1000*5)
        // .subscribe((x: number) => this.downloadFromDB$.next());
    
    }
    
    getModuleWithId(id: string) {
        return this.allModules$.pipe(map(x => x.filter(x => x.id === id)[0]));
    }
    
    getManifacturerWithId(id: string) {
        return this.allManufacturers$.pipe(map(x => x.filter(x => x.id === id)[0]));
    }
    
    private updateLastUpdated(): void {
        this.storage.set('lastUpdated', new Date().toISOString())
            .subscribe();
    }
}