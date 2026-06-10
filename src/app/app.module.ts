import { registerLocaleData } from '@angular/common';
import localeItExtra from '@angular/common/locales/extra/it';
import localeIt from '@angular/common/locales/it';
import {
  ErrorHandler,
  InjectionToken,
  LOCALE_ID,
  NgModule
} from '@angular/core';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import build from 'src/build';
import { environment } from 'src/environments/environment';

import { AppComponent } from './app.component';
import { AppFeaturesModule } from './features/app-features.module';
import { AppRoutingModule } from './app-routing.module';
import { BackboneModule } from './features/backbone/backbone.module';
import { FeedbackBoxModule } from './features/backbone/feedback-box/feedback-box.module';
import { UserAuthGuard } from './features/backbone/login/user-auth-guard.service';
import { MatDialogRef } from "@angular/material/dialog";
import {
  MAT_SNACK_BAR_DEFAULT_OPTIONS,
  MatSnackBarConfig
} from "@angular/material/snack-bar";
import { SelectionPanelBridgeService } from 'src/app/components/patch-parts/selection-panel-bridge.service';
import { TimeagoModule } from 'ngx-timeago';
import { LazySentryErrorHandler } from './features/backbone/sentry-integration/lazy-sentry-error-handler';


const locale: {
  useValue: string;
  provide: InjectionToken<string>;
} = {
  provide:  LOCALE_ID,
  useValue: 'en-US'
};
const localeCode = 'en-US';
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
  imports: [
    AppComponent,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    AppFeaturesModule,
    FeedbackBoxModule,
    BackboneModule,
    TimeagoModule.forRoot(),
//keep as last (for routes)
  ],
  providers:    [
    SelectionPanelBridgeService,
    locale,
    matDatepickerLocale,
    matDatepickerLocaleIT,
    UserAuthGuard,
    {
      provide: MatDialogRef,
      useValue: {}
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        verticalPosition: 'top',
        horizontalPosition: 'end',
      } as MatSnackBarConfig
    },
    {
      provide: ErrorHandler,
      useClass: LazySentryErrorHandler,
    }
  ],
  bootstrap:    [AppComponent]
})
export class AppModule {
  
  constructor() {
    registerLocaleData(localeIt, localeItExtra);
    console.clear();
    
    
    console.log(
      `\n%cBuild Info:\n\n` +
      `%c ❯ Environment: %c${ environment.production ? 'production 🏭' : 'development 🚧' }\n` +
      `%c ❯ Build Version: ${ build.version }\n` +
      ` ❯ Build Timestamp: ${ build.timestamp }\n` +
      ` ❯ Build Message: %c${ build.message || '<no message>' }\n`,
      'font-size: 14px; color: #7c7c7b;', // px-ok: console.log CSS requires px, rem not supported
      'font-size: 12px; color: #7c7c7b', // px-ok
      environment.production ? 'font-size: 12px; color: #95c230;' : 'font-size: 12px; color: #e26565;', // px-ok
      'font-size: 12px; color: #7c7c7b', // px-ok
      'font-size: 12px; color: #bdc6cf' // px-ok
    );
  }
  
}
