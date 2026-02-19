import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { UserAreaDataService } from "src/app/features/routes/user-area/user-area-data.service";
import { AsyncPipe } from "@angular/common";
import { AutoUpdateLoadingIndicatorModule } from "src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module";
import {
  MatChipListbox,
  MatChipOption
} from "@angular/material/chips";
import { FlexModule } from "@angular/flex-layout";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { MatCardSubtitle } from "@angular/material/card";
import { RackListModule } from "src/app/components/rack-list/rack-list.module";


@Component({
  selector: 'app-user-manuals',
  imports: [
    AsyncPipe,
    AutoUpdateLoadingIndicatorModule,
    MatChipListbox,
    MatChipOption,
    FlexModule,
    HeroContentCardModule,
    MatCardSubtitle,
    RackListModule,
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