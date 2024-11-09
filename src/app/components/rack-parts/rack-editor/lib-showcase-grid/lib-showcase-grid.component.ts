import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";
import {
  NgForOf,
  NgIf
} from "@angular/common";
import { MatIcon } from "@angular/material/icon";


interface LabelValueData {
  label: string;
  value: string;
  icon?: string;
}

@Component({
  selector: 'app-lib-showcase-grid',
  standalone: true,
  imports: [
    LabelValueShowcaseModule,
    NgForOf,
    MatIcon,
    NgIf
  ],
  templateUrl: './lib-showcase-grid.component.html',
  styleUrl: './lib-showcase-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibShowcaseGridComponent {
  
  @Input() data: LabelValueData[] = [];
  @Input() minSize: string = '6rem'; // Default size is 12rem
  
}
