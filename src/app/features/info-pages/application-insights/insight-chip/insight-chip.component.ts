import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';


@Component({
  selector: 'app-insight-chip',
  templateUrl: './insight-chip.component.html',
  styleUrls: ['./insight-chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InsightChipComponent {
  @Input() icon: string = '';
  @Input() label: string = '';
  @Input() value: string = '';
  @Input() compact: boolean = false;
  @Input() featured: boolean = false;
}
