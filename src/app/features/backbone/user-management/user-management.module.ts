import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserManagementComponent } from 'src/app/features/backbone/user-management/user-management.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: UserManagementComponent
      }
    ]),
    UserManagementComponent
  ],
  exports: [UserManagementComponent]
})
export class UserManagementModule {}
