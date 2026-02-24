import {
  Component,
  Input
} from '@angular/core';
import { HomeProofTone } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


@Component({
  selector: 'app-home-proof-showcase',
  templateUrl: './home-proof-showcase.component.html',
  styleUrls: ['./home-proof-showcase.component.scss'],
  standalone: false
})
export class HomeProofShowcaseComponent {
  @Input() kicker = '';
  @Input() title = '';
  @Input() description = '';
  @Input() keywords: string[] = [];
  @Input() tone: HomeProofTone = 'patch';
  @Input() reverse = false;
  
  getDescriptionSegments() {
    return buildHomeTextSegments(this.description, this.keywords);
  }
}