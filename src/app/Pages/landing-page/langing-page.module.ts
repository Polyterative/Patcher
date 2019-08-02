import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatCardModule }          from '@angular/material';
import { MatFormEntityModule }    from '../../Utils/LocalLibraries/mat-form-entity/mat-form-entity.module';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { LandingPageComponent }   from './landing-page.component';

@NgModule({
  declarations: [LandingPageComponent],
  exports: [LandingPageComponent],
  imports: [
    CommonModule,
    OrangeStructuresModule,
    MatCardModule,
    FlexLayoutModule,
    MatFormEntityModule
  ]
})
export class LangingPageModule { }
