import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


@Component({
  selector: 'app-browser-reset-filters-button',
  templateUrl: './browser-reset-filters-button.component.html',
  styleUrls: ['./browser-reset-filters-button.component.scss'],
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class BrowserResetFiltersButtonComponent {
  @Input() canReset$!: Observable<boolean>;
  @Output() reset$ = new EventEmitter<void>();
}
