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
import { LabelValueData } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';


@Component({
  selector: 'app-module-detail-data-card',
  templateUrl: './module-detail-data-card.component.html',
  styleUrls: ['./module-detail-data-card.component.scss'],
  animations: [
    trigger('moduleDetailSupportEnter', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1 }))
      ], { params: { delay: 0, duration: 170 } })
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleDetailDataCardComponent {
  @Input() title: string = '';
  @Input() data: LabelValueData[] = [];
  @Input() animationDelay: number = 0;
}
