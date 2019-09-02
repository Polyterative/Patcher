import {
    Component,
    Input
} from '@angular/core';

@Component({
    selector:    'lib-spacer',
    templateUrl: './spacer.component.html',
    styleUrls:   ['./spacer.component.scss']
})
export class SpacerComponent {

    @Input()
    inset: boolean = false;

    @Input()
    vertical: boolean = false;

}
