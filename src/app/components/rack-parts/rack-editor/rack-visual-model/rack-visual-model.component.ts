import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { Subject }                from 'rxjs';
import { RackedModule }           from '../../../../models/module';
import { RackMinimal }            from '../../../../models/rack';
import { RackDetailDataService }  from '../../rack-detail-data.service';
import { ModuleRightClick }       from '../rack-editor.component';

@Component({
  selector:        'app-rack-visual-model',
  templateUrl:     './rack-visual-model.component.html',
  styleUrls:       ['./rack-visual-model.component.scss'],
  animations:      [
    fadeInOnEnterAnimation({
      duration: 225,
      anchor:   'enter'
      // animateChildren: 'before',
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackVisualModelComponent implements OnInit {
  
  @Input() rackData: RackMinimal;
  
  @Input() rowedRackedModules: RackedModule[][];
  @Input() isCurrentRackPropertyOfCurrentUser: boolean;
  @Input() isCurrentRackEditable: boolean;
  
  @Input() rackDetailDataService: RackDetailDataService;
  
  @Input() moduleRightClick$: Subject<ModuleRightClick>;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
