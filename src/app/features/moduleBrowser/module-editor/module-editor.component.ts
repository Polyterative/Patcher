import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                                   from '@angular/core';
import { Subject }                  from 'rxjs';
import { DBEuroModule }             from '../../../models/models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-editor',
    templateUrl:     './module-editor.component.html',
    styleUrls:       ['./module-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorComponent implements OnInit {
    @Input() data: DBEuroModule;
    public readonly save$ = new Subject();
    
    constructor(public dataService: ModuleBrowserDataService) {
    
    }
    
    ngOnInit(): void {
    }
    
}