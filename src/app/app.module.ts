import { registerLocaleData }      from '@angular/common';
import localeItExtra               from '@angular/common/locales/extra/it';
import localeIt                    from '@angular/common/locales/it';
import {
  InjectionToken,
  LOCALE_ID,
  NgModule
}                                  from '@angular/core';
import { AngularFireModule }       from '@angular/fire';
import { AngularFirestoreModule }  from '@angular/fire/firestore';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
}                                  from '@angular/material/core';
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

const italianLocale: { useValue: string; provide: InjectionToken<string>; } = {
  provide:  LOCALE_ID,
  useValue: 'it'
};
const localeCode = 'it';
const matDatepickerLocale: { useValue: string; provide: InjectionToken<string>; } = {
  provide:  MAT_DATE_LOCALE,
  useValue: localeCode
};
const matDatepickerLocaleIT = {
  provide:  MAT_DATE_FORMATS,
  useValue: {
    parse:   {
      dateInput: 'DD/MM/YYYY'
    },
    display: {
      dateInput:          'DD/MM/YYYY',
      monthYearLabel:     'MM YYYY',
      dateA11yLabel:      'DD/MM/YYYY',
      monthYearA11yLabel: 'MM YYYY'
    }
  }
};


@NgModule({
  declarations: [
    AppComponent,
    LandingPageComponent
  ],
  imports:      [
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
  providers:    [
    italianLocale,
    matDatepickerLocale,
    matDatepickerLocaleIT
  ],
  bootstrap:    [AppComponent]
})
export class AppModule {
  
  constructor() {
    registerLocaleData(localeIt, localeItExtra);
  }
  
  
}
