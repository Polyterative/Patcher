import {
    ChangeDetectionStrategy,
    Component
}                   from '@angular/core';
import { FlexBase } from '../flex-base';

@Component({
    selector:        'lib-flex-row-wrap',
    templateUrl:     './flex-row-wrap.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlexRowWrapComponent extends FlexBase {

}
