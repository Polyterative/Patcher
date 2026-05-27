import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-dev-only-window',
  templateUrl: './dev-only-window.component.html',
  styleUrls: ['./dev-only-window.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class DevOnlyWindowComponent {
  show = !environment.production;

  @Input() pre = false;
}