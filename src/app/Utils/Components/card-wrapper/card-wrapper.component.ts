import {
    ChangeDetectionStrategy,
    Component
}                             from '@angular/core';
import { RoutingService }     from '../../../Services/routing.service';
import { CardWrapperService } from './card-wrapper.service';

@Component({
    selector:        'app-card-wrapper',
    templateUrl:     './card-wrapper.component.html',
    styleUrls:       ['./card-wrapper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardWrapperComponent {
    
    links: MyURL[] = [
        {label: 'Soundcloud', url: 'https://soundcloud.com/polyterative'},
        {label: 'Spotify', url: 'https://open.spotify.com/artist/1Z8s4xLHCLIf8LAZP6BBj4?si=KQ7TY4soToCkBqT7F50TZA'},
        {label: 'Instagram', url: 'http://instagram.com/polyterative/'},
        {label: 'Github', url: 'https://github.com/Polyterative'},
        {label: 'LinkedIn', url: 'https://www.linkedin.com/in/vlady-yakovenko-13833870/'}
    ];
    
    constructor(
        public service: CardWrapperService,
        public routing: RoutingService
    ) {
        
    }
}

interface MyURL {
    label: string;
    url: string;
}
