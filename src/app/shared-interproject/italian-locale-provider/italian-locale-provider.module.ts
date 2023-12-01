import { CommonModule, registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { InjectionToken, LOCALE_ID, NgModule } from '@angular/core';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

const italianLocale: { useValue: string; provide: InjectionToken<string>; } = {
  provide:  LOCALE_ID,
  useValue: 'it'
};
const localeCode = 'it-IT';
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
  declarations: [],
  imports:      [
    CommonModule
  ],
  providers:    [
    italianLocale,
    matDatepickerLocale,
    matDatepickerLocaleIT,
    {
      provide:  LOCALE_ID,
      useValue: 'it-IT'
    }
  ]
})
export class ItalianLocaleProviderModule {
  constructor() {
    registerLocaleData(localeIt); //leave it here, needed for stock angular stuff
  }
}
