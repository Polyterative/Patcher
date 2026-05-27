import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { ModuleBrowserAdderComponent } from '../module-browser-adder/module-browser-adder.component';
import { ModuleAdderDataService } from '../module-browser-adder/module-adder-data.service';
import { ModuleListModule } from '../module-list/module-list.module';

@NgModule({
  declarations: [ModuleBrowserAdderComponent],
  providers: [ModuleAdderDataService],
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: ModuleBrowserAdderComponent }]),
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatFormEntityComponent,
    BrandPrimaryButtonComponent,
    HeroContentCardComponent,
    ScreenWrapperComponent,
    ModuleListModule,
  ],
})
export class ModuleAdderModule {}
