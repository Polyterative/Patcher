import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                     from 'rxjs';
import { Patch }      from '../../models/patch';

@Injectable()
export class PatchBuilderDataService {
  generate$ = new Subject<number>();
  generated$ = new BehaviorSubject<Patch | undefined>(undefined);
  
  constructor() {
    // this.generate$.pipe(withLatestFrom(allmodules.modulesList$))
    //     .subscribe(([x, modules]) => {
    //           const toReturn: Connection[] = [];
    //
    //           // const usableOUTs = modules.filter(module => module.outs && module.outs.length > 0);
    //           // const usableINs = modules.filter(module => module.ins && module.ins.length > 0);
    //
    //           // for (let i = 0; i < x; i++) {
    //           //
    //           //     const A = usableOUTs[this.randomIntFromInterval(usableOUTs.length - 1)];
      //           //     const B = usableINs[this.randomIntFromInterval(usableINs.length - 1)];
      //           //
      //           //       const Aid: number = this.randomIntFromInterval(A.outs.length - 1);
      //           //       const bID: number = this.randomIntFromInterval(B.ins.length - 1);
      //           //
      //           //       const item = {
      //           //           from:   A,
      //           //           fromId: Aid,
      //           //           to:     B,
      //           //           toId:   bID
      //           //       };
      //           //       toReturn.push(item);
      //           //
      //           //   }
      //
      //           this.generated$.next({connections: toReturn});
      //       }
      //     );
    }
    
    randomIntFromInterval(max, min = 0) { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    // private importData(): void {
    //     const xa = [];
    //     const xo = [];
    //
    //     console.clear();
    //     // console.log('before');
    //     // console.log(allmodules.length);
    //
    //     for (let mo of allmodules) {
    //
    //         if (mo && mo.price && parseInt(mo.price)) {
    //
    //             if (mo.name.includes('HP')) {
    //                 mo = {
    //                     name:         mo.manufacturer,
    //                     manufacturer: mo.desc,
    //                     hp:           mo.name,
    //                     price:        mo.hp,
    //                     desc:         mo.price
    //                 };
    //             }
    //
    //             xa.push(mo);
    //         } else {
    //             xo.push(mo);
    //         }
    //     }
    //
    //     // console.log('after');
    //     // console.log(xa.length);
    //     // console.log(xa);
  //
  //     const xaz: Module[] = [];
  //     for (const xaElement of xa) {
    //
    //         if (xaElement.manufacturer.includes(xaElement.name)) {
    //
    //             xaz.push({
    //                 name:        xaElement.name.trim(),
    //                 description: xaElement.description,
    //                 mkr:         {
    //                     name: xaElement.manufacturer.substr(xaElement.name.length)
    //                                    .trim()
    //                 },
    //                 hp:          parseInt(xaElement.hp)
  //
  //             } as Module);
  //         }
    //
    //
    //     }
    //     console.log(JSON.stringify(xaz));
    //
    //     // console.log([
    //     //     A,
    //     //     B,
    //     //     Aid,
    //     //     bID
    //     // ]);
    //     // debugger
    // }
}
