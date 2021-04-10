import { Injectable } from '@angular/core';
import { StorageMap } from '@ngx-pwa/local-storage';

@Injectable()
export class LocalStorageService {
    
    // https://github.com/cyrilletuzi/angular-async-local-storage
    constructor(private storage: StorageMap) {
    };
    
}