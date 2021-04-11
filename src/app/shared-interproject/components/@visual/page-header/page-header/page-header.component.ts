import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
} from '@angular/core';

@Component({
    selector:        'app-page-header',
    templateUrl:     './page-header.component.html',
    styleUrls:       ['./page-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent implements OnInit {
    @Input() color = '#778698';
    @Input() title: string = 'Detault title';
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}