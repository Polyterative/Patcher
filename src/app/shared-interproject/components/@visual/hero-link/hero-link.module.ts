import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from '../../@smart/empty-state/empty-state.module';
import { BrandPrimaryButtonModule } from '../brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from '../clean-card/clean-card.module';
import { HeroLinkComponent } from './hero-link.component';
import { MatDialogModule } from "@angular/material/dialog";


@NgModule({
  declarations: [HeroLinkComponent],
  exports:      [
    HeroLinkComponent
  ],
  imports:      [
    CommonModule,
    MatDialogModule,
    BrandPrimaryButtonModule,
    FlexLayoutModule,
    MatCardModule,
    MatIconModule,
    RouterModule,
    EmptyStateModule,
    CleanCardModule
  ]
})
export class HeroLinkModule {}