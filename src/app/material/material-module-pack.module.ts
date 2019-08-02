import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import { MatButtonModule }         from '@angular/material/button';
import { MatCardModule }           from '@angular/material/card';
import { MatChipsModule }          from '@angular/material/chips';
import { MatDialogModule }         from '@angular/material/dialog';
import { MatExpansionModule }      from '@angular/material/expansion';
import { MatFormFieldModule }      from '@angular/material/form-field';
import { MatIconModule }           from '@angular/material/icon';
import { MatInputModule }          from '@angular/material/input';
import { MatListModule }           from '@angular/material/list';
import { MatMenuModule }           from '@angular/material/menu';
import { MatPaginatorModule }      from '@angular/material/paginator';
import { MatProgressBarModule }    from '@angular/material/progress-bar';
import { MatRadioModule }          from '@angular/material/radio';
import { MatSlideToggleModule }    from '@angular/material/slide-toggle';
import { MatSnackBarModule }       from '@angular/material/snack-bar';
import { MatTableModule }          from '@angular/material/table';
import { MatTabsModule }           from '@angular/material/tabs';
import { MatToolbarModule }        from '@angular/material/toolbar';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  imports:      [
    CommonModule
  ],
  declarations: [],
  exports:      [
    BrowserModule,
    BrowserAnimationsModule,
    // FLEX
    FlexLayoutModule,
    // MATERIAL
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatSnackBarModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatTableModule,
    MatToolbarModule,
    MatPaginatorModule
  ]
})
export class MaterialModulePack {
}
