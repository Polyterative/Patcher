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
                
                const usableOUTs: EuroModule[] = modules.filter(module => module.outs && module.outs.length > 0);
                const usableINs: EuroModule[] = modules.filter(module => module.ins && module.ins.length > 0);
                
                for (let i = 0; i < x; i++) {
                    
                    const A: EuroModule = usableINs[this.randomIntFromInterval(usableINs.length - 1)];
                    const B: EuroModule = usableOUTs[this.randomIntFromInterval(usableOUTs.length - 1)];
                    
                    const Aid: number = this.randomIntFromInterval(A.outs.length - 1);
                    const bID: number = this.randomIntFromInterval(B.ins.length - 1);
                    
                    const item: { toId: number; from: EuroModule; to: EuroModule; fromId: number } = {
                        from:   A,
                        fromId: Aid,
                        to:     B,
                        toId:   bID
                    };
                    toReturn.push(item);
                    
                    if (item.to.ins[item.toId] == undefined) {
                        debugger;
                    }
                }
                
                this.generated$.next({connections: toReturn});
            }
        );
    }
    
    randomIntFromInterval(max, min = 0) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    private importData(): void {
        // const xa = [];
        // const xo = [];
        //
        // console.clear();
        // // console.log('before');
        // // console.log(allmodules.length);
        //
        // for (let mo of allmodules) {
        //    
        //     if (mo && mo.price && parseInt(mo.price)) {
        //        
        //         if (mo.name.includes('HP')) {
        //             mo = {
        //                 name:         mo.manufacturer,
        //                 manufacturer: mo.desc,
        //                 hp:           mo.name,
        //                 price:        mo.hp,
        //                 desc:         mo.price
        //             };
        //         }
        //        
        //         xa.push(mo);
        //     } else {
        //         xo.push(mo);
        //     }
        // }
        //
        // // console.log('after');
        // // console.log(xa.length);
        // // console.log(xa);
        //
        // const xaz: EuroModule[] = [];
        // for (const xaElement of xa) {
        //    
        //     if (xaElement.manufacturer.includes(xaElement.name)) {
        //        
        //         xaz.push({
        //             name:        xaElement.name.trim(),
        //             description: xaElement.description,
        //             mkr:         {
        //                 name: xaElement.manufacturer.substr(xaElement.name.length)
        //                                .trim()
        //             },
        //             hp:          parseInt(xaElement.hp)
        //            
        //         } as EuroModule);
        //     }
        //    
        //    
        // }
        // console.log(JSON.stringify(xaz));
        //
        // // console.log([
        // //     A,
        // //     B,
        // //     Aid,
        // //     bID
        // // ]);
        // // debugger
    }
}
