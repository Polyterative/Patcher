import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';


@Component({
  selector: 'app-restricted-entity',
  templateUrl: './restricted-entity.component.html',
  styleUrls: ['./restricted-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class RestrictedEntityComponent {
  @Input() disabled: boolean = false;
}