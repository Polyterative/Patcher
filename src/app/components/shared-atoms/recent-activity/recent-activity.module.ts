import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { RecentActivityComponent } from './recent-activity.component';
import { SupabaseUtcTimestampPipe } from 'src/app/shared-interproject/pipes/supabase-utc-timestamp.pipe';


@NgModule({
  declarations: [RecentActivityComponent],
  imports: [
    CommonModule,
    MatIconModule,
    RouterLink,
    TimeagoModule.forChild(),
    SupabaseUtcTimestampPipe
  ],
  exports: [RecentActivityComponent]
})
export class RecentActivityModule {}
