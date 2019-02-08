import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material/material.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent }     from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports:      [
    // BASE
    BrowserModule,
    AppRoutingModule,
    // BASIC
    MaterialModule
    // LIBS
    // EXT LIBS

  ],
  providers:    [],
  bootstrap:    [AppComponent]
})
export class AppModule {
}
