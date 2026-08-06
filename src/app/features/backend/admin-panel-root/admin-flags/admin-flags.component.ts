import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { AdminFlagsDataService } from './admin-flags-data.service';


@Component({
  selector:        'app-admin-flags',
  templateUrl:     './admin-flags.component.html',
  styleUrls:       ['./admin-flags.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false,
  providers:       [AdminFlagsDataService]
})
export class AdminFlagsComponent {
  constructor(
    public dataService: AdminFlagsDataService
  ) {}

  confirmDelete(id: number): void {
    if (window.confirm('Delete this flag? This action cannot be undone.')) {
      this.dataService.deleteFlag$.next(id);
    }
  }
}
