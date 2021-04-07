import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    Subject
}                     from 'rxjs';
import {
    Connection,
    EuroModule,
    modules,
    Patch
}                     from './models/models';

@Injectable()
export class PatchBuilderDataService {
    generate$ = new Subject();
    generated$ = new BehaviorSubject<Patch | undefined>(undefined);
    
    constructor() {
        this.generate$.subscribe(x => {
            const toReturn: Connection[] = [];
            
            for (let i = 0; i < 10; i++) {
                
                const A: EuroModule = modules[this.randomIntFromInterval(modules.length - 1)];
                const B: EuroModule = modules[this.randomIntFromInterval(modules.length - 1)];
                
                let Aouts = A.outs;
                const Aid: number = this.randomIntFromInterval(Aouts.length - 1);
                
                let bINs = B.ins;
                const bID: number = this.randomIntFromInterval(bINs.length - 1);
                
                
                toReturn.push({
                    from: `${ A.name } ${ Aouts[Aid]?.title }`,
                    to:   `${ B.name } ${ bINs[bID]?.title }`
                });
                
                console.log([
                    A,
                    B,
                    Aid,
                    bID
                ]);
                // debugger
                
            }
            
            this.generated$.next({connections: toReturn});
        });
    }
    
    randomIntFromInterval(max, min = 0) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}
