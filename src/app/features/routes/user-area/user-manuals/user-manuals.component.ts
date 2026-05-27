import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { UserAreaDataService } from "src/app/features/routes/user-area/user-area-data.service";
import { AsyncPipe } from "@angular/common";
import { AutoUpdateLoadingIndicatorComponent } from "src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component";
import {
  MatChipListbox,
  MatChipOption
} from "@angular/material/chips";
import { HeroContentCardComponent } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component";
import { RackListModule } from "src/app/components/rack-list/rack-list.module";
import { EmptyStateTipsComponent } from "src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component";


@Component({
  selector: 'app-user-manuals',
  imports: [
    AsyncPipe,
    AutoUpdateLoadingIndicatorComponent,
    MatChipListbox,
    MatChipOption,
    HeroContentCardComponent,
    RackListModule,
    EmptyStateTipsComponent,
  ],
  templateUrl: './user-manuals.component.html',
  styleUrl: './user-manuals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManualsComponent {
  
  constructor(
    public dataService: UserAreaDataService
  ) {
    this.dataService.updateManualsData$.next();
    
  }
  
  openManual(url: string) {
    window.open(url, '_blank');
  }
}
