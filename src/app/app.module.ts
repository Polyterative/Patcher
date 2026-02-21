import { registerLocaleData } from '@angular/common';
import localeItExtra from '@angular/common/locales/extra/it';
import localeIt from '@angular/common/locales/it';
import {
  ErrorHandler,
  InjectionToken,
  LOCALE_ID,
  NgModule
} from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AdviceTooltipModule } from 'src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip.module';
import build from 'src/build';
import { environment } from 'src/environments/environment';

import { AppComponent } from './app.component';
import { AppFeaturesModule } from './features/app-features.module';
import { BackboneModule } from './features/backbone/backbone.module';
import { FeedbackBoxModule } from './features/backbone/feedback-box/feedback-box.module';
import { UserAuthGuard } from './features/backbone/login/user-auth-guard.service';
import { ToolbarModule } from './features/backbone/toolbar/toolbar.module';
import { PageHeaderModule } from './shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule } from './shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { MatDialogRef } from "@angular/material/dialog";
import {
  MAT_SNACK_BAR_DEFAULT_OPTIONS,
  MatSnackBarConfig
} from "@angular/material/snack-bar";

import * as Sentry from "@sentry/angular";
import { AppFaqComponent } from "src/app/components/shared-atoms/app-faq/app-faq.component";
import { SelectionPanelOutletComponent } from 'src/app/components/patch-parts/selection-panel-outlet/selection-panel-outlet.component';
import { SelectionPanelBridgeService } from 'src/app/components/patch-parts/selection-panel-bridge.service';


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
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    SelectionPanelOutletComponent,
    RouterModule,
    BrowserAnimationsModule,
    ToolbarModule,
    AppFeaturesModule,
    FeedbackBoxModule,
    ScreenWrapperModule,
    PageHeaderModule,
    MatToolbarModule,
    FlexLayoutModule,
    MatCardModule,
    AdviceTooltipModule,
    MatDividerModule,
    BackboneModule,
    AppFaqComponent,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
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
      useValue: Sentry.createErrorHandler(),
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
      'font-size: 14px; color: #7c7c7b;',
      'font-size: 12px; color: #7c7c7b',
      environment.production ? 'font-size: 12px; color: #95c230;' : 'font-size: 12px; color: #e26565;',
      'font-size: 12px; color: #7c7c7b',
      'font-size: 12px; color: #bdc6cf'
    );
  }
  
}