import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { ModuleBrowserRootModule } from 'src/app/features/module-browser/module-browser-root/module-browser-root.module';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { ModuleCollectionEditorComponent } from './module-collection-editor.component';
import { ModuleCollectionCreatorComponent } from '../module-collection-creator/module-collection-creator.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';

@NgModule({
  declarations: [ModuleCollectionEditorComponent, ModuleCollectionCreatorComponent],
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    ModulePartsModule,
    ModuleBrowserRootModule,
    CleanCardComponent,
    BrandPrimaryButtonComponent
  ],
  exports: [ModuleCollectionEditorComponent, ModuleCollectionCreatorComponent]
})
export class ModuleCollectionEditorModule {}
