import {
    EventEmitter,
    Injectable
}                          from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { tap }             from 'rxjs/internal/operators/tap';
import { debounceTime }    from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ToolbarService {

    title: BehaviorSubject<string> = new BehaviorSubject('Vlady Yakovenko');

    backClick$: EventEmitter<void> = new EventEmitter<void>();
    primaryClick$: EventEmitter<void> = new EventEmitter<void>();

    toolbarVisible$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    primaryVisible$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    primaryDisabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    primaryAutoDisabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    primaryIcon$: BehaviorSubject<ToolbarPrimaryIcon> = new BehaviorSubject(ToolbarPrimaryIcon.ADD);

    constructor() {
        this.backClick$.subscribe(_ => { // defaults on change
            this.primaryVisible$.next(false);
            this.primaryIcon$.next(ToolbarPrimaryIcon.ADD);
        });

        this.title
          .pipe(
            tap(x => this.primaryAutoDisabled$.next(true)),
            debounceTime(500)
          )
          .subscribe(_ => this.primaryAutoDisabled$.next(false));

        this.backClick$.subscribe(x => {
            this.primaryDisabled$.next(false); // reset to default
        });

    }

    private static completeObservers(observers): void {
        for (const observer of observers) {
            observer.complete();
        }
    }
}

export enum ToolbarPrimaryIcon {
    ADD    = 'add',
    SEARCH = 'search',
    SAVE   = 'save'
}
