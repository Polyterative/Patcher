import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { ModuleRightClick } from '../rack-editor.component';


@Component({
  selector: 'app-rack-visual-model',
  templateUrl: './rack-visual-model.component.html',
  styleUrls: ['./rack-visual-model.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      duration: 225,
      anchor: 'enter',
      animateChildren: 'after'
      // animateChildren: 'before',
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackVisualModelComponent implements OnInit, AfterViewInit {
  
  @Input() rackData: RackMinimal;
  
  @Input() rowedRackedModules: RackedModule[][];
  @Input() isCurrentRackPropertyOfCurrentUser: boolean;
  @Input() isCurrentRackEditable: boolean;
  
  @Input() rackDetailDataService: RackDetailDataService;
  
  @Input() moduleRightClick$: Subject<ModuleRightClick>;
  
  @ViewChild('screen') screenReference: ElementRef;
  
  
  constructor(
    public dataService: RackDetailDataService,
  ) {
  }
  
  ngOnInit(): void {
  }
  
  // on after edit update reference on that a service of the current HMTL element reference
  ngAfterViewInit(): void {
    this.dataService.currentDownloadElementRef$.next({
      screen: this.screenReference
    });
  }
  
  isLastRowEmpty(rowedRackedModules: RackedModule[][]) {
    return rowedRackedModules[rowedRackedModules.length - 1].length === 0;
  }
}