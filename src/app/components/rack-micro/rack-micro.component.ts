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
import { CoolButtonComponent } from '../shared-atoms/cool-button/cool-button.component';
import { ReactionEntityTypes } from 'src/app/features/backend/supabase-reactions';


@Component({
    selector: 'app-rack-micro',
    templateUrl: './rack-micro.component.html',
    styleUrls: ['./rack-micro.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RackImageComponent, HeroClickableTitleComponent, SharedAtomsModule, CoolButtonComponent]
})
export class RackMicroComponent implements OnInit {
  
  @Input() data: RackMinimal;
  
  @Input() viewConfig: RackMinimalViewConfig;
  @Input() showCoolAction = false;
  readonly ReactionEntityTypes = ReactionEntityTypes;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}