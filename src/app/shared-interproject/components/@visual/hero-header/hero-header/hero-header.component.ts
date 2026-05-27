import { FlexLayoutModule } from '@angular/flex-layout';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';


@Component({
  selector: 'lib-hero-header',
  templateUrl: './hero-header.component.html',
  styleUrls: ['./hero-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FlexLayoutModule]
})
export class HeroHeaderComponent implements OnInit {
  @Input() public readonly title = '';
  @Input() public readonly description = '';
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}