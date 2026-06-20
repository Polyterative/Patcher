import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { PatchMinimal } from '../../models/patch';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from '../patch-parts/patch-minimal/patch-minimal.component';
import { HeroClickableTitleComponent } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { HeroInfoBoxTextDirective } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';
import { MatCardSubtitle } from '@angular/material/card';


@Component({
    selector: 'app-patch-micro',
    templateUrl: './patch-micro.component.html',
    styleUrls: ['./patch-micro.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [HeroClickableTitleComponent, HeroInfoBoxTextDirective, SharedAtomsModule, MatCardSubtitle]
})
export class PatchMicroComponent implements OnInit {
  
  @Input() data: PatchMinimal | null = null;
  
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  @Input() showCoolOverlayPoc = false;

  constructor() { }
  
  ngOnInit(): void {
  }
  
}