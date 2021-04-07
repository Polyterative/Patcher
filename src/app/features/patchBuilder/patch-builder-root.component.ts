import {
    ChangeDetectionStrategy,
    Component,
    OnInit
}                                  from '@angular/core';
import { PatchBuilderDataService } from './patch-builder-data.service';

@Component({
    selector:        'app-patch-builder-root',
    templateUrl:     './patch-builder-root.component.html',
    styleUrls:       ['./patch-builder-root.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBuilderRootComponent implements OnInit {
    
    constructor(
        public dataService: PatchBuilderDataService
    ) { }
    
    ngOnInit(): void {
        this.dataService.generate$.next(10);
    }
    
}
