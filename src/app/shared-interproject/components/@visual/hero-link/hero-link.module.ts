import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from '../../@smart/empty-state/empty-state.module';
import { BrandPrimaryButtonModule } from '../brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from '../clean-card/clean-card.module';
import { HeroLinkComponent } from './hero-link.component';

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
    MatButtonModule,
    CleanCardModule
  ]
})
export class HeroLinkModule {}
