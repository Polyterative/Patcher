import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit
}                            from '@angular/core';
import {
    BehaviorSubject,
    timer
}                            from 'rxjs';
import {
    filter,
    map,
    switchMap,
    takeUntil,
    tap
}                            from 'rxjs/operators';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';

@Component({
    selector:        'app-word-swapper',
    templateUrl:     './word-swapper.component.html',
    styleUrls:       ['./word-swapper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WordSwapperComponent extends AngularEntityBase implements OnInit {
    @Input()
    words: Array<string>;
    curr: BehaviorSubject<string> = new BehaviorSubject('');
    
    private reset = new EventEmitter<void>();
    
    constructor() {
        super();
    }
    
    ngOnInit(): void {
        this.reset.pipe(
            takeUntil(this.destroyEvent$),
            switchMap(x => timer(0, 2000).pipe(takeUntil(this.reset))),
            tap(x => {
                if (this.words[x] === undefined) {
                    this.reset.emit();
                }
            }),
            map(x => this.words[x]),
            filter(x => x !== undefined)
        )
            .subscribe(this.curr);
        
        this.reset.emit();
    }
    
}
