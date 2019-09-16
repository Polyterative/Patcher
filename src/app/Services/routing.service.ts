import { Injectable } from '@angular/core';
import { Router }     from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class RoutingService {
    
    constructor(
        private router: Router
    ) {
    }
    
    routeTo(paths: string[]) {
        this.router.navigate(paths);
    }
    
    openInNewTab(fullPath: string) {
        const win = window.open(fullPath, '_blank');
        win.focus();
    }
    
}
