import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                     from '@angular/core';
import { EuroModule } from '../../../models/models';

@Component({
    selector:        'app-module-browser-module',
    templateUrl:     './module-browser-module.component.html',
    styleUrls:       ['./module-browser-module.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleComponent implements OnInit {
    @Input() data: EuroModule;
    
    ngOnInit(): void {
    }
    
}