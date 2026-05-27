import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileDragHostModule } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.module';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { AdviceTooltipComponent } from 'src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { ModuleEditorAdderLineComponent } from './module-editor-adder-line/module-editor-adder-line.component';
import { ModuleEditorCropperComponent } from './module-editor-cropper.component';
import { ModuleEditorCvFormLineComponent } from './module-editor-cv-form-line/module-editor-cv-form-line.component';
import { ModuleEditorComponent } from './module-editor.component';

@NgModule({
  declarations: [
    ModuleEditorComponent,
    ModuleEditorCvFormLineComponent,
    ModuleEditorAdderLineComponent,
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatTooltipModule,
    FileDragHostModule,
    MatFormEntityComponent,
    AdviceTooltipComponent,
    CleanCardComponent,
    ModuleEditorCropperComponent,
  ],
  exports: [ModuleEditorComponent]
})
export class ModuleEditorModule {}
