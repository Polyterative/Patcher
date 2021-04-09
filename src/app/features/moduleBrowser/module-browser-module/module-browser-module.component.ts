import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                                   from '@angular/core';
import { Observable }               from 'rxjs';
import { share }                    from 'rxjs/operators';
import {
    LocalEuroModule,
    LocalManufacturer
}                                   from '../../../models/models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-browser-module',
    templateUrl:     './module-browser-module.component.html',
    styleUrls:       ['./module-browser-module.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleComponent implements OnInit {
    @Input() data: LocalEuroModule;
    @Input() showAll = false;
    
    manufacturer$: Observable<LocalManufacturer>;
    
    constructor(public dataService: ModuleBrowserDataService) {}
    
    ngOnInit(): void {
        // @ts-ignore
        this.manufacturer$ = this.dataService.storage.getManifacturerWithId(this.data.manufacturerId)
                                 .pipe(share());
    
    }
    
}