import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { UserDataHandlerModule } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { HomeComponent } from './home.component';


@NgModule({
  declarations: [
    HomeComponent
  ],
  exports: [
    HomeComponent
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    RouterModule.forRoot([
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        component: HomeComponent
      }
    ], {scrollPositionRestoration: 'enabled'}),
    UserDataHandlerModule,
    ScreenWrapperModule,
    BrandPrimaryButtonModule,
  ]
})
export class HomeModule {}