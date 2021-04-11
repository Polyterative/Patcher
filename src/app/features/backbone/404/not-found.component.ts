import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
    selector:        'app-not-found',
    templateUrl:     './not-found.component.html',
    styleUrls:       ['./not-found.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent implements OnInit {
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}