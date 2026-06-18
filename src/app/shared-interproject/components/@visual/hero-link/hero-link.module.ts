import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { EmptyStateComponent } from '../../@smart/empty-state/empty-state.component';
import { BrandPrimaryButtonComponent } from '../brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from '../clean-card/clean-card.component';
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
    BrandPrimaryButtonComponent,
    MatCardModule,
    MatIconModule,
    RouterModule,
    EmptyStateComponent,
    CleanCardComponent
  ]
})
export class HeroLinkModule {}