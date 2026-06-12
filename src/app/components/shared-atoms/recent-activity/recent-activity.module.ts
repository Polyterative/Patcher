import { NgModule } from '@angular/core';
import { TimeagoModule } from 'ngx-timeago';
import { RecentActivityComponent } from './recent-activity.component';

@NgModule({
  imports: [
    TimeagoModule.forChild(),
    RecentActivityComponent
  ],
  exports: [RecentActivityComponent]
})
export class RecentActivityModule {}
