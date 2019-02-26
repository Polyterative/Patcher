import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { OrangeStructuresModule }  from 'src/app/LocalLibraries/OrangeStructures/orange-structures.module';
import { VioletUtilsModule }       from 'src/app/LocalLibraries/VioletUtilities/violet-utils.module';
import { MaterialModule }          from 'src/app/material/material.module';
import { AppRoutingModule }        from './app-routing.module';
import { AppComponent }            from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports:      [
    // BASE
    BrowserModule,
    AppRoutingModule,
    // BASIC
    MaterialModule,
    // LIBS
    OrangeStructuresModule,
    VioletUtilsModule,
    BrowserAnimationsModule
    // EXT LIBS

  ],
  providers:    [],
  bootstrap:    [AppComponent]
})
export class AppModule {
}
