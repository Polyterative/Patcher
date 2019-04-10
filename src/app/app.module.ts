import { NgModule }                from '@angular/core';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { OrangeStructuresModule } from 'src/app/LocalLibraries/OrangeStructures/orange-structures.module';
import { VioletUtilsModule }      from 'src/app/LocalLibraries/VioletUtilities/violet-utils.module';
import { MaterialModule }         from 'src/app/material/material.module';
import { LocalStoreModule }       from 'src/app/store/store.module';
import { AppRoutingModule }       from './app-routing.module';
import { AppComponent }           from './app.component';

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
    BrowserAnimationsModule,
    // EXT LIBS
    LocalStoreModule
  ],
  providers:    [],
  bootstrap:    [AppComponent]
})
export class AppModule {
}
