import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from "@angular/material/dialog";
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { BehaviorSubject } from 'rxjs';

type UserRacksSectionFilter = 'PERSONAL' | 'COOL';


@Component({
  selector: 'app-user-racks',
  templateUrl: './user-racks.component.html',
  styleUrls: ['./user-racks.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms {{ delay }}ms ease', style({opacity: 1}))
      ], { params: { delay: 0 } })
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserRacksComponent {
  rackMinimalViewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};
  @Input() globalSearchQuery = '';
  @Input() showCoolFilter = false;
  readonly activeSectionFilter$ = new BehaviorSubject<UserRacksSectionFilter>('PERSONAL');
  readonly sectionFilters: {value: UserRacksSectionFilter; label: string; icon: string}[] = [
    {value: 'PERSONAL', label: 'Personal', icon: 'view_stream'},
    {value: 'COOL', label: 'Cool!', icon: 'auto_awesome'},
  ];
  readonly sectionDescriptionByFilter: Record<UserRacksSectionFilter, string> = {
    PERSONAL: 'Keep track of your racks, check if your modules fit, and share them with your friends',
    COOL: 'Public racks you have marked cool, newest first.'
  };
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
  ) {
    
    // update with local user data
    this.dataService.updateRackData$.next(undefined);
  }

  visibleFilters(): {value: UserRacksSectionFilter; label: string; icon: string}[] {
    return this.showCoolFilter
      ? this.sectionFilters
      : this.sectionFilters.filter(filter => filter.value !== 'COOL');
  }

  selectFilter(filter: UserRacksSectionFilter): void {
    this.activeSectionFilter$.next(filter);
  }
   
}
