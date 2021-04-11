import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                          from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector:        'app-route-clickable-link-list',
    templateUrl:     './route-clickable-link.component.html',
    styleUrls:       ['./route-clickable-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteClickableLinkComponent implements OnInit {
    @Input()
    public readonly data$ = new BehaviorSubject<RouteClickableLink[]>([]);
    
    ngOnInit(): void {
    }
    
    doNothing(): any {
    
    }
}

export interface RouteClickableLink {
    label: string,
    route: string,
    icon?: string;
    disabled: boolean;
}