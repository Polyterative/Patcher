import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';


@Component({
  selector: 'app-restricted-entity',
  templateUrl: './restricted-entity.component.html',
  styleUrls: ['./restricted-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FlexLayoutModule]
})
export class RestrictedEntityComponent {
  @Input() disabled: boolean = false;
}