import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from "@angular/material/dialog";
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { BehaviorSubject } from 'rxjs';

type UserPatchesSectionFilter = 'PERSONAL' | 'COOL';


@Component({
  selector: 'app-user-patches',
  templateUrl: './user-patches.component.html',
  styleUrls: ['./user-patches.component.scss'],
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
export class UserPatchesComponent {
  @Input() globalSearchQuery = '';
  @Input() showCoolFilter = false;
  readonly activeSectionFilter$ = new BehaviorSubject<UserPatchesSectionFilter>('PERSONAL');
  readonly sectionFilters: {value: UserPatchesSectionFilter; label: string; icon: string}[] = [
    {value: 'PERSONAL', label: 'Personal', icon: 'settings_input_composite'},
    {value: 'COOL', label: 'Cool!', icon: 'auto_awesome'},
  ];
  readonly sectionDescriptionByFilter: Record<UserPatchesSectionFilter, string> = {
    PERSONAL: "So many patches, so little time. Patches you've created and those you're currently working on",
    COOL: 'Public patches you have marked cool, newest first.'
  };
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
  ) {
    this.dataService.updatePatchesData$.next();
   
  }

  visibleFilters(): {value: UserPatchesSectionFilter; label: string; icon: string}[] {
    return this.showCoolFilter
      ? this.sectionFilters
      : this.sectionFilters.filter(filter => filter.value !== 'COOL');
  }

  selectFilter(filter: UserPatchesSectionFilter): void {
    this.activeSectionFilter$.next(filter);
  }

}
