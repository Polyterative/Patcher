import {
    ChangeDetectionStrategy,
    Component,
    OnInit
}                             from '@angular/core';
import { CardWrapperService } from '../../Utils/Components/card-wrapper/card-wrapper.service';

@Component({
    selector:        'app-about-me',
    templateUrl:     './about-me.component.html',
    styleUrls:       ['./about-me.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutMeComponent implements OnInit {

    constructor(
      public wrapperService: CardWrapperService
    ) {

        // wrapperService.shouldWrap$.next(false);
    }

    ngOnInit() {
    }

}
