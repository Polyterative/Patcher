import { Injectable } from '@angular/core';
import { StorageMap } from '@ngx-pwa/local-storage';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
    
    // https://github.com/cyrilletuzi/angular-async-local-storage
    constructor(private storage: StorageMap) {
    };
    
}