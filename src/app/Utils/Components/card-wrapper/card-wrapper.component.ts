import {
  ChangeDetectionStrategy,
  Component
}                             from '@angular/core';
import { CardWrapperService } from 'src/app/Utils/Components/card-wrapper/card-wrapper.service';
import { RoutingService }     from '../../../Services/routing.service';

@Component({
  selector:        'app-card-wrapper',
  templateUrl:     './card-wrapper.component.html',
  styleUrls:       ['./card-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardWrapperComponent {
  
  links: MyURL[] = [
    {label: 'Github', url: 'https://github.com/Polyterative'},
    {label: 'Soundcloud', url: 'https://soundcloud.com/polyterative'},
    {label: 'Instagram', url: 'http://instagram.com/polyterative/'},
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
