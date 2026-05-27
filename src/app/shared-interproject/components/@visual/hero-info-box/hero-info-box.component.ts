import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { HeroInfoBoxService } from './hero-info-box.service';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hero-info-box',
  templateUrl: './hero-info-box.component.html',
  styleUrls: ['./hero-info-box.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({
          opacity: 0,
          height: 0.01
        }),
        animate('75ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
        style({opacity: 1})
      ]),
      transition(':leave', [
        animate('75ms cubic-bezier(0.4, 0.0, 1, 1)'),
        style({opacity: 0})
      ])
    ])
 ],
 standalone: true,
 imports: [AsyncPipe, FlexLayoutModule, MatCardModule]
})
export class HeroInfoBoxComponent {
 constructor(public dataService: HeroInfoBoxService) { }
}