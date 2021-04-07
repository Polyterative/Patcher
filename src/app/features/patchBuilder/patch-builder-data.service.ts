import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    Subject
}                     from 'rxjs';
import {
    Connection,
    Patch
}                     from './models/models';

@Injectable()
export class PatchBuilderDataService {
    generate$ = new Subject();
    generated$ = new BehaviorSubject<Patch | undefined>(undefined);
    
    
    constructor() {
        this.generate$.subscribe(x => {
            let toReturn: Connection[] = [];
            
            for (let i = 0; i < 5; i++) {
                toReturn.push({
                    from: '',
                    to:   ''
                });
            }
            
            this.generated$.next({connections: toReturn});
        });
    }
}

