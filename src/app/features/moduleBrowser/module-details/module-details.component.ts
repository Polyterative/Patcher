import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                       from '@angular/core';
import { DBEuroModule } from '../../../models/models';

@Component({
    selector:        'app-module-details',
    templateUrl:     './module-details.component.html',
    styleUrls:       ['./module-details.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleDetailsComponent implements OnInit {
    @Input() data: DBEuroModule;
    
    ins = [];
    switches = [];
    outs = [];
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}