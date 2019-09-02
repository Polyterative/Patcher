import {
    ChangeDetectionStrategy,
    Component
}                          from '@angular/core';
import { FirebaseService } from '../../Services/firebase.service';
import { RoutingService }  from '../../Services/routing.service';

@Component({
    selector:        'app-home',
    templateUrl:     './home.component.html',
    styleUrls:       ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
    words = [
        '👩‍💻 developer',
        '🎸 guitar player',
        '📸 photographer',
        '🎹 electronic music producer',
        '👽 human'
    ];

    constructor(
      public routing: RoutingService,
      public dataservice: FirebaseService
    ) {
    }
}
