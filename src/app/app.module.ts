import { NgModule }                from '@angular/core';
import { AngularFireModule }       from '@angular/fire';
import { AngularFirestoreModule }  from '@angular/fire/firestore';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModulePack }        from 'src/app/material/material-module-pack.module';
import { LandingPageComponent }      from 'src/app/Pages/landing-page/landing-page.component';
import { MatFormEntityModule }       from 'src/app/Utils/LocalLibraries/mat-form-entity/mat-form-entity.module';
import { OrangeStructuresModule }    from 'src/app/Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { VioletUtilsModule }         from 'src/app/Utils/LocalLibraries/VioletUtilities/violet-utils.module';
import { PolyUtilsComponentsModule } from 'src/app/Utils/poly-utils-components.module';
import { environment }               from 'src/environments/environment';
import { AppRoutingModule }          from './app-routing.module';
import { AppComponent }              from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    LandingPageComponent
  ],
  imports: [
    // BASE
    BrowserModule,
    AppRoutingModule,
    // BASIC
    MaterialModulePack,
    // LIBS
    OrangeStructuresModule,
    VioletUtilsModule,
    BrowserAnimationsModule,
    // INTERNAL UTILS
    PolyUtilsComponentsModule,
    // EXT LIBS
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    MatFormEntityModule
    // imports firebase/firestore, only needed for database features
    // AngularFireAuthModule, // imports firebase/auth, only needed for auth features,
    // AngularFireStorageModule // imports firebase/storage only needed for storage features
    // APP LOCAL COMPONENTS
  ],
  providers:    [],
  bootstrap:    [AppComponent]
})
export class AppModule {
}
