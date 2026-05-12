import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from '../rack-detail-data.service';


@Component({
  selector: 'app-rack-details',
  templateUrl: './rack-details.component.html',
  styleUrls: ['./rack-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackDetailsComponent {
  @Input() data: RackMinimal;

  constructor(public dataService: RackDetailDataService) {}
}
