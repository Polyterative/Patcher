import { Component }          from '@angular/core';
import { CardWrapperService } from 'src/app/Utils/Components/card-wrapper/card-wrapper.service';

@Component({
  selector:    'app-card-wrapper',
  templateUrl: './card-wrapper.component.html',
  styleUrls:   ['./card-wrapper.component.scss']
})
export class CardWrapperComponent {
  
  constructor(public service: CardWrapperService) {
  
  }
}
