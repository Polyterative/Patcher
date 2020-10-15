import {
    Component,
    EventEmitter,
    OnDestroy
}                        from '@angular/core';
import { ReplaySubject } from 'rxjs';

export interface Destructable {
    destroyEvent$: ReplaySubject<void>;
}

@Component({
    template: ''
})
export abstract class AngularEntityBase implements OnDestroy, Destructable {
    
    destroyEvent$: ReplaySubject<void> = new ReplaySubject<void>();
    
    protected constructor() {
    }
    
    ngOnDestroy(): void {
        this.destroyEvent$.next();
        this.destroyEvent$.complete();
        
    }
    
}
