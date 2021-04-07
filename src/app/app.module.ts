import { registerLocaleData }      from '@angular/common';
import localeItExtra               from '@angular/common/locales/extra/it';
import localeIt                    from '@angular/common/locales/it';
import {
    InjectionToken,
    LOCALE_ID,
    NgModule
}                                  from '@angular/core';
import {
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE
}                                  from '@angular/material/core';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule }   from './app-routing.module';
import { AppComponent }       from './app.component';
import { BackboneModule }     from './features/backbone/backbone.module';
import { ToolbarModule }      from './features/backbone/toolbar/toolbar.module';
import { PatchBuilderModule } from './features/patchBuilder/patch-builder.module';

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
    imports:      [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        BackboneModule,
        ToolbarModule,
        PatchBuilderModule
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
