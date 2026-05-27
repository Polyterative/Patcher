import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';


@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule
  ]
})
export class PageHeaderComponent implements OnInit {
    @Input() color = '#778698';
    @Input() title: string = 'Detault title';
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}