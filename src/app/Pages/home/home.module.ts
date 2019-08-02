import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatCardModule }          from '@angular/material';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { HomeComponent }          from './home.component';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    OrangeStructuresModule,
    FlexLayoutModule,
    MatCardModule
  ],
  exports:      [HomeComponent]
})
export class HomeModule {}
