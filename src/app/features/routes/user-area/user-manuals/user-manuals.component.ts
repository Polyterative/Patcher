import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { UserAreaDataService } from "src/app/features/routes/user-area/user-area-data.service";
import { AsyncPipe } from "@angular/common";
import { AutoUpdateLoadingIndicatorModule } from "src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module";
import { BrandPrimaryButtonModule } from "src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module";
import { FlexModule } from "@angular/flex-layout";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { MatCardSubtitle } from "@angular/material/card";
import { RackListModule } from "src/app/components/rack-list/rack-list.module";
import { MatButton } from "@angular/material/button";


@Component({
  selector: 'app-user-manuals',
  imports: [
    AsyncPipe,
    AutoUpdateLoadingIndicatorModule,
    BrandPrimaryButtonModule,
    FlexModule,
    HeroContentCardModule,
    MatCardSubtitle,
    RackListModule,
    MatButton
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