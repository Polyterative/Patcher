import { Injectable } from '@angular/core';

export abstract class Logger {
    abstract get info(): (message?: any) => void;
    
    abstract get warn(): (message?: any) => void;
    
    abstract get error(): (message?: any) => void;
    
    abstract get log(): (message?: any) => void;
    
    // abstract get table(): (message?: any) => void;
}

const noop = (a?: any): any => void 0;

@Injectable({
    providedIn: 'root'
})
export class LoggerService implements Logger {
    invokeConsoleMethod(type: string, args?: any): void {
    }
    
    get info() {
        return noop;
    }
    
    get warn() {
        return noop;
    }
    
    get error() {
        return noop;
    }
    
    get log() {
        return noop;
    }
    
    // get table() {
    //     return noop;
    // }
}
