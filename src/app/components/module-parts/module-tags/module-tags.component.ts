import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                   from '@angular/core';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
}                   from 'angular-animations';
import { DbModule } from '../../../models/module';

@Component({
  selector:        'app-module-tags',
  templateUrl:     './module-tags.component.html',
  styleUrls:       ['./module-tags.component.scss'],
  animations:      [
    fadeInOnEnterAnimation({
      anchor:   'enter',
      duration: 225
    }),
    fadeOutOnLeaveAnimation({
      anchor:   'leave',
      duration: 225
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleTagsComponent implements OnInit {
  
  @Input() data: DbModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
