import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type ReactionEntityType } from 'src/app/features/backend/supabase-reactions';
import {
  CoolButtonDataService,
  type CoolCountDisplayMode
} from './cool-button-data.service';

@Component({
  selector: 'app-cool-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  providers: [CoolButtonDataService],
  templateUrl: './cool-button.component.html',
  styleUrls: ['./cool-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoolButtonComponent implements OnChanges {
  @Input() entityType: ReactionEntityType | null | undefined = null;
  @Input() entityId: number | null | undefined = null;
  @Input() eligible: boolean | null | undefined = false;
  @Input() countDisplayMode: CoolCountDisplayMode | null | undefined = 'count';

  constructor(readonly dataService: CoolButtonDataService) {}

  ngOnChanges(): void {
    this.dataService.setEntity({
      entityType: this.entityType ?? null,
      entityId: this.entityId ?? null,
      eligible: this.eligible === true,
      countDisplayMode: this.countDisplayMode ?? 'count'
    });
  }
}
