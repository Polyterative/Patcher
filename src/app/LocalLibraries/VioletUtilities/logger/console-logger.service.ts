import { Injectable } from '@angular/core';
import { Logger }     from './logger.service';

/* tslint:disable:curly */

@Injectable({
  providedIn: 'root'
})
export class ConsoleLoggerService implements Logger {
  
  invokeConsoleMethod(type: string, args?: any): void {
    const logFn: Function = (console)[type] || console.log || (() => void 0);
    logFn.apply(console, [args]);
  }
  
  get info() {
    return console.info.bind(console);
  }
  
  get warn() {
    return console.warn.bind(console);
  }
  
  get error() {
    return console.error.bind(console);
  }
  
  // get table() {
  //     return console.table.bind(console);
  // }
  get log(): (message?: any) => void {
    return function (p1: any) {
    };
  }
  
}
