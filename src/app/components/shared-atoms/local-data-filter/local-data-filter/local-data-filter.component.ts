import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { LocalDataFilterService } from '../local-data-filter.service';


@Component({
  selector: 'app-local-data-filter',
  templateUrl: './local-data-filter.component.html',
  styleUrls: ['./local-data-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatFormEntityComponent]
})
export class LocalDataFilterComponent {
  constructor(public dataService: LocalDataFilterService) { }
}