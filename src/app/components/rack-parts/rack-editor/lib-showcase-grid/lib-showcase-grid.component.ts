import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";
import { AsyncPipe } from "@angular/common";
import { MatBadge } from "@angular/material/badge";


interface LabelValueData {
  label: string;
  value: string;
  icon?: string;
  hidden?: boolean;
  size?: string;
  badge?: string;
}

@Component({
  selector: 'app-lib-showcase-grid',
  imports: [
    LabelValueShowcaseModule,
    AsyncPipe,
    MatBadge
  ],
  templateUrl: './lib-showcase-grid.component.html',
  styleUrl: './lib-showcase-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibShowcaseGridComponent {
  public data$ = new BehaviorSubject<LabelValueData[]>([]);
  
  @Input() set data(values: LabelValueData[]) {
    this.data$.next(values.filter(v => !v.hidden));
  }
  
}