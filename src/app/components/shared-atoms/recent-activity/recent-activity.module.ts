import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { RecentActivityComponent } from './recent-activity.component';


@NgModule({
  declarations: [RecentActivityComponent],
  imports: [
    CommonModule,
    MatIconModule,
    RouterLink,
    TimeagoModule.forChild()
  ],
  exports: [RecentActivityComponent]
})
export class RecentActivityModule {}
