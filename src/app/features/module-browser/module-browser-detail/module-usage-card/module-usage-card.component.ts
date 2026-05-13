import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-module-usage-card',
  templateUrl: './module-usage-card.component.html',
  styleUrls: ['./module-usage-card.component.scss'],
  animations: [
    trigger('moduleDetailSupportEnter', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1 }))
      ], { params: { delay: 0, duration: 185 } })
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleUsageCardComponent {
  @Input() title: string = '';
  @Input() data$!: Observable<unknown>;
  @Input() updateData$!: Observable<unknown>;
  @Input() items: unknown[] | null | undefined = null;
  @Input() entityType: 'rack' | 'patch' = 'rack';
  @Input() showHiddenUsageNote: boolean = false;
  @Input() hiddenUsageSupplementCopy: string = '';
  @Input() usagePendingCopy: string = '';
  @Input() noPublicUsageCopy: string = '';
  @Input() isUsageSummaryLoaded: boolean = false;
  @Input() animationDelay: number = 0;
}
