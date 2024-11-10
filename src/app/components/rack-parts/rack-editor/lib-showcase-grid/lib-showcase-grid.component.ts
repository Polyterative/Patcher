import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";
import {
  AsyncPipe,
  NgForOf,
  NgIf
} from "@angular/common";
import { MatIcon } from "@angular/material/icon";


interface LabelValueData {
  label: string;
  value: string;
  icon?: string;
  hidden?: boolean;
  size?: string;
}

@Component({
  selector: 'app-lib-showcase-grid',
  standalone: true,
  imports: [
    LabelValueShowcaseModule,
    NgForOf,
    MatIcon,
    NgIf,
    AsyncPipe
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
