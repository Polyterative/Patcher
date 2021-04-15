import { CommonModule }               from '@angular/common';
import { NgModule }                   from '@angular/core';
import { AngularFireModule }          from '@angular/fire';
import { AngularFireAnalyticsModule } from '@angular/fire/analytics';
import { AngularFireAuth }            from '@angular/fire/auth';
import { FlexLayoutModule }           from '@angular/flex-layout';
import { RouterModule }               from '@angular/router';
import { LuxonModule }                from 'luxon-angular';
import { environment }                from '../../../environments/environment';
import { BrandPrimaryButtonModule }   from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { AdminGuardService }          from './admin-guard.service';
import { AdminPanelRootComponent }    from './admin-panel-root/admin-panel-root.component';
import { FirebaseService }            from './firebase.service';
import { LocalStorageService }        from './local-storage.service';
import { SupabaseService }            from './supabase.service';

@NgModule({
    declarations: [
        AdminPanelRootComponent
    ],
    providers:    [
        AdminGuardService,
        LocalStorageService,
        AngularFireAuth,
        FirebaseService,
        SupabaseService
    ],
    imports:      [
        CommonModule,
        LuxonModule,
        RouterModule.forRoot([
            {
                path:        'admin',
                component:   AdminPanelRootComponent,
                canActivate: [AdminGuardService]
            }
        ]),
        AngularFireModule.initializeApp(environment.firebase),
        AngularFireAnalyticsModule,
        FlexLayoutModule,
        BrandPrimaryButtonModule
    ],
    exports:      [
        AdminPanelRootComponent
    ]
})
export class BackendModule {
}
