import { registerLocaleData }      from '@angular/common';
import localeItExtra               from '@angular/common/locales/extra/it';
import localeIt                    from '@angular/common/locales/it';
import {
  InjectionToken,
  LOCALE_ID,
  NgModule
}                                  from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import { MatCardModule }           from '@angular/material/card';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
}                                  from '@angular/material/core';
import { MatToolbarModule }        from '@angular/material/toolbar';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule }            from '@angular/router';

import { AppComponent }        from './app.component';
import { AppFeaturesModule }   from './features/app-features.module';
import { BackboneModule }      from './features/backbone/backbone.module';
import { FeedbackBoxModule }   from './features/backbone/feedback-box/feedback-box.module';
import { UserAuthGuard }       from './features/backbone/login/user-auth-guard.service';
import { ToolbarModule }       from './features/backbone/toolbar/toolbar.module';
import { PageHeaderModule }    from './shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule } from './shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';

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
    AppComponent
  ],
  imports:   [
    BrowserModule,
    RouterModule,
    BrowserAnimationsModule,
    ToolbarModule,
    AppFeaturesModule,
    FeedbackBoxModule,
    ScreenWrapperModule,
    BackboneModule,//keep as last (for routes)
    PageHeaderModule,
    MatToolbarModule,
    FlexLayoutModule,
    MatCardModule

  ],
  providers: [
    italianLocale,
    matDatepickerLocale,
    matDatepickerLocaleIT,
    UserAuthGuard
  ],
  bootstrap:    [AppComponent]
})
export class AppModule {
  
  constructor() {
    registerLocaleData(localeIt, localeItExtra);
    console.clear();
  }
  
}
