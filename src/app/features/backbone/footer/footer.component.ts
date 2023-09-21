import {
    ChangeDetectionStrategy,
    Component,
    OnInit
} from '@angular/core';

@Component({
    selector:        'app-footer',
    templateUrl:     './footer.component.html',
    styleUrls:       ['./footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent implements OnInit {
    helpUrl: string = 'https://docs.patcher.xyz/quick-start/';
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}