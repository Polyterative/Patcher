import {
    EventEmitter,
    OnDestroy
} from '@angular/core';

export interface Destructable {
    destroyEvent$: EventEmitter<void>;
}

export abstract class AngularEntityBase implements OnDestroy, Destructable {
    
    destroyEvent$: EventEmitter<void> = new EventEmitter<void>();
    
    protected constructor() {
    }
    
    ngOnDestroy(): void {
        this.destroyEvent$.emit();
        this.destroyEvent$.complete();
        
    }
    
}
