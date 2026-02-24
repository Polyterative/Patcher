import {
  Component,
  Input
} from '@angular/core';
import { HomeLinkPill } from '../../home-content.models';


@Component({
  selector: 'app-home-curiosity-bridge',
  templateUrl: './home-curiosity-bridge.component.html',
  styleUrls: ['./home-curiosity-bridge.component.scss'],
  standalone: false
})
export class HomeCuriosityBridgeComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() links: HomeLinkPill[] = [];
}
