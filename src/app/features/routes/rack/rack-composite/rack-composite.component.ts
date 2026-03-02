import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { Rack } from 'src/app/models/rack';


@Component({
  selector: 'app-rack-composite',
  templateUrl: './rack-composite.component.html',
  styleUrls: ['./rack-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackCompositeComponent {
  @Input() data: Rack;
  
  constructor() {}
}