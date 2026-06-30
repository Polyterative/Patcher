import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { RackMinimal } from '../../models/rack';
import { RackMinimalViewConfig } from '../rack-parts/rack-minimal/rack-minimal.component';
import { RackImageComponent } from '../rack-parts/rack-image/rack-image.component';
import { HeroClickableTitleComponent } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';


@Component({
    selector: 'app-rack-micro',
    templateUrl: './rack-micro.component.html',
    styleUrls: ['./rack-micro.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RackImageComponent, HeroClickableTitleComponent, SharedAtomsModule]
})
export class RackMicroComponent implements OnInit {
  
  @Input() data: RackMinimal;
  
  @Input() viewConfig: RackMinimalViewConfig;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}