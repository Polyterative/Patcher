import {
    ChangeDetectionStrategy,
    Component
}                   from '@angular/core';
import { FlexBase } from '../flex-base';

@Component({
    selector:        'lib-flex-row',
    templateUrl:     './flex-row.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlexRowComponent extends FlexBase {

}
