import {
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-dialog-info-box',
  templateUrl: './dialog-info-box.component.html',
  styleUrls: ['./dialog-info-box.component.scss'],
  standalone: true,
  imports: [
    CommonModule
  ]
})
export class DialogInfoBoxComponent {
  @Input() icon: string = '💡';
  @Input() title: string = '';
  @Input() items: string[] = [];
}