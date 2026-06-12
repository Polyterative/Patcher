import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { HeroClickableTitleComponent } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { ModuleCollectionCardComponent } from './module-collection-card.component';

@NgModule({
  declarations: [ModuleCollectionCardComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    SharedAtomsModule,
    HeroClickableTitleComponent
  ],
  exports: [ModuleCollectionCardComponent]
})
export class ModuleCollectionCardModule {}
