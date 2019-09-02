import {
    ChangeDetectionStrategy,
    Component
}                         from '@angular/core';
import { RoutingService } from '../../../Services/routing.service';
import { ToolbarService } from './toolbar.service';

@Component({
    selector:        'app-toolbar',
    templateUrl:     './toolbar.component.html',
    styleUrls:       ['./toolbar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent {

    constructor(public data: ToolbarService, private routing: RoutingService) {
    }

}
