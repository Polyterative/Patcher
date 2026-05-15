import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { PatchMinimal } from 'src/app/models/patch';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { RoutingService } from 'src/app/services/routing.service';


@Component({
  selector: 'app-user-patches',
  templateUrl: './user-patches.component.html',
  styleUrls: ['./user-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserPatchesComponent {
  @Input() globalSearchQuery = '';
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
    private routingService: RoutingService,
    private urlCreatorService: UrlCreatorService
  ) {
    this.dataService.updatePatchesData$.next();
   
  }

  copyPatchShareLink(patch: PatchMinimal): void {
    const shareUrl = this.absoluteUrlFromLink(this.routingService.linkToPatch(patch));

    this.urlCreatorService.copyTextToClipboard(shareUrl, 'Share link copied.');
  }

  private absoluteUrlFromLink(link: (string | number)[]): string {
    const path = link.map(segment => String(segment)).join('/').replace(/\/+/g, '/');
    return `${ window.location.origin }${ path.startsWith('/') ? path : `/${ path }` }`;
  }
}
