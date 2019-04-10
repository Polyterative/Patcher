import { CommonModule }         from '@angular/common';
import { NgModule }             from '@angular/core';
import { NgxsEmitPluginModule } from '@ngxs-labs/emitter';
import {
  NgxsDevtoolsOptions,
  NgxsReduxDevtoolsPluginModule
}                               from '@ngxs/devtools-plugin';
import {
  NgxsLoggerPluginModule,
  NgxsLoggerPluginOptions
}                               from '@ngxs/logger-plugin';
import { NgxsModule }           from '@ngxs/store';
import { NgxsConfig }           from '@ngxs/store/src/symbols';
import { CounterState }         from 'src/app/store/counter.state';

export const OPTIONS_CONFIG: Partial<NgxsConfig> = {
  /**
   * Run in development mode. This will add additional debugging features:
   * - Object.freeze on the state and actions to guarantee immutability
   * todo: you need set production mode
   * import { environment } from '@env';
   * developmentMode: !environment.production
   */
  developmentMode: true
};

export const DEVTOOLS_REDUX_CONFIG: NgxsDevtoolsOptions = {
  /**
   * Whether the dev tools is enabled or note. Useful for setting during production.
   * todo: you need set production mode
   * import { environment } from '@env';
   * disabled: environment.production
   */
  disabled: false
};

export const LOGGER_CONFIG: NgxsLoggerPluginOptions = {
  /**
   * Disable the logger. Useful for prod mode..
   * todo: you need set production mode
   * import { environment } from '@env';
   * disabled: environment.production
   */
  disabled: false
};

@NgModule({
  imports: [
    CommonModule,
    NgxsModule.forRoot([CounterState], OPTIONS_CONFIG),
    NgxsReduxDevtoolsPluginModule.forRoot(DEVTOOLS_REDUX_CONFIG),
    NgxsLoggerPluginModule.forRoot(LOGGER_CONFIG),
    NgxsEmitPluginModule.forRoot()
  ],
  exports: [NgxsModule]
})
export class LocalStoreModule {
}
