import { CommonModule }                  from '@angular/common';
import { NgModule }                      from '@angular/core';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsFormPluginModule }          from '@ngxs/form-plugin';
import { NgxsLoggerPluginModule }        from '@ngxs/logger-plugin';
import { NgxsRouterPluginModule }        from '@ngxs/router-plugin';
import { NgxsModule }                    from '@ngxs/store';
// import { TodoState }   from '@integration/store/todos/todo/todo.state';
// import { TodosState }  from '@integration/store/todos/todos.state';
import { environment as env }            from 'src/environments/environment';

@NgModule({
  imports: [
    CommonModule,
    NgxsFormPluginModule.forRoot(),
    NgxsLoggerPluginModule.forRoot({logger: console, collapsed: false}),
    NgxsReduxDevtoolsPluginModule.forRoot({disabled: env.production}),
    NgxsRouterPluginModule.forRoot(),
    NgxsModule.forRoot(
      [
        // TodosState,
        // TodoState
      ],
      {developmentMode: !env.production}
    )
  ],
  exports: [
    NgxsFormPluginModule,
    NgxsLoggerPluginModule,
    NgxsReduxDevtoolsPluginModule,
    NgxsModule
  ]
})
export class NgxsStoreModule {
}
