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
    generate$ = new Subject<number>();
    generated$ = new BehaviorSubject<Patch | undefined>(undefined);
    
    constructor() {
        this.generate$.subscribe(x => {
                const toReturn: Connection[] = [];
                
                for (let i = 0; i < x; i++) {
                    
                    const A: EuroModule = modules[this.randomIntFromInterval(modules.length - 1)];
                    const B: EuroModule = modules[this.randomIntFromInterval(modules.length - 1)];
                    
                    const Aid: number = this.randomIntFromInterval(A.outs.length - 1);
                    const bID: number = this.randomIntFromInterval(B.ins.length - 1);
                    
                    let item: { toId: number; from: EuroModule; to: EuroModule; fromId: number } = {
                        from:   A,
                        fromId: Aid,
                        to:     B,
                        toId:   bID
                    };
                    toReturn.push(item);
                    
                    if (item.to.ins[item.toId] == undefined) {
                        debugger
                    }
                }
                
                
                // console.log([
                //     A,
                //     B,
                //     Aid,
                //     bID
                // ]);
                // debugger
                
                
                this.generated$.next({connections: toReturn});
            }
        );
    }
    
    randomIntFromInterval(max, min = 0) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}