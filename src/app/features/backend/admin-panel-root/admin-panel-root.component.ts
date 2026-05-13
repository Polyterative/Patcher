import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { SupabaseService } from '../supabase.service';


@Component({
  selector: 'app-admin-panel-root',
  templateUrl: './admin-panel-root.component.html',
  styleUrls: ['./admin-panel-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdminPanelRootComponent {
  constructor(public backend: SupabaseService) {}
}
