import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { EntityStatItem } from 'src/app/components/shared-atoms/entity-stat-grid/entity-stat-grid.component';

export type LabelValueData = EntityStatItem;

@Component({
  selector: 'app-lib-showcase-grid',
  imports: [
    SharedAtomsModule
  ],
  templateUrl: './lib-showcase-grid.component.html',
  styleUrl: './lib-showcase-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibShowcaseGridComponent {
  @Input() data: LabelValueData[] = [];
}
