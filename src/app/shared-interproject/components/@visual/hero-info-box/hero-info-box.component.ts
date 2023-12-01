import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { HeroInfoBoxService } from './hero-info-box.service';

@Component({
  selector:    'app-hero-info-box',
  templateUrl: './hero-info-box.component.html',
  styleUrls:   ['./hero-info-box.component.scss'],
  animations:      [
    trigger('fadeInOut', [
      transition(':enter', [   // :enter is alias to 'void => *'
        style({
          opacity: 0,
          height:  0.01
        }),
        animate('75ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
        style(
          {opacity: 1}
        )
      ]),
      transition(':leave', [   // :leave is alias to '* => void'
        animate('75ms cubic-bezier(0.4, 0.0, 1, 1)'),
        style(
          {opacity: 0}
        )
      ])
    ])
  ]

})
export class HeroInfoBoxComponent implements OnInit {
  constructor(public dataService: HeroInfoBoxService) { }

  ngOnInit(): void {
  }

}
