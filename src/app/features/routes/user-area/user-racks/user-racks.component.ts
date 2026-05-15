import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { RackMinimal } from 'src/app/models/rack';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { RoutingService } from 'src/app/services/routing.service';


@Component({
  selector: 'app-user-racks',
  templateUrl: './user-racks.component.html',
  styleUrls: ['./user-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserRacksComponent {
  rackMinimalViewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};
  @Input() globalSearchQuery = '';
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
    private routingService: RoutingService,
    private urlCreatorService: UrlCreatorService
  ) {
    
    // update with local user data
    this.dataService.updateRackData$.next(undefined);
  }

  copyRackShareLink(rack: RackMinimal): void {
    const shareUrl = this.absoluteUrlFromLink(this.routingService.linkToRack(rack));

    this.urlCreatorService.copyTextToClipboard(shareUrl, 'Share link copied.');
  }

  private absoluteUrlFromLink(link: (string | number)[]): string {
    const path = link.map(segment => String(segment)).join('/').replace(/\/+/g, '/');
    return `${ window.location.origin }${ path.startsWith('/') ? path : `/${ path }` }`;
  }
  
}
