import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { HomeLinkPill } from '../../home-content.models';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-curiosity-bridge',
  templateUrl: './home-curiosity-bridge.component.html',
  styleUrls: ['./home-curiosity-bridge.component.scss'],
  standalone: true,
  imports: [MatIconModule, RouterModule]
})
export class HomeCuriosityBridgeComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() links: HomeLinkPill[] = [];
}
