import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
    selector:        'app-common-sidebar',
    templateUrl:     './common-sidebar.component.html',
    styleUrls:       ['./common-sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommonSidebarComponent implements OnInit {
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}
