import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit, OnDestroy,
} from '@angular/core';
import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  Observable,
  Subject
} from 'rxjs';
import {
  map,
  takeUntil
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { MinimalModule } from 'src/app/models/module';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { ModuleDetailDataService } from '../module-detail-data.service';


@Component({
  selector: 'app-module-minimal',
  templateUrl: './module-minimal.component.html',
  styleUrls: ['./module-minimal.component.scss'],
  animations: [
    trigger('moduleDetailFadeEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 180 }
      })
    ]),
    trigger('moduleDetailCopyEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.2, 0, 0, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 180 }
      })
    ]),
    trigger('moduleDetailInlineEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.2, 0, 0, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 170 }
      })
    ]),
    trigger('moduleDetailActionsEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 185 }
      })
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleMinimalComponent implements OnInit, OnDestroy {
  @Input() data: MinimalModule;
  @Input() viewConfig: ModuleMinimalViewConfig;
  /** Optional suffix shown inline next to the module name (e.g. instance label) */
  @Input() nameSuffix: string | undefined = undefined;
  @Input() preferredPanelColor: number | null = null;
  @Input() portraitDetailSplit = false;
  isTagChooserOpen = false;

  isInCollection$: Observable<boolean>;
  
  get insCount(): number {
    return this.data?.ins?.length ?? 0;
  }
  
  get outsCount(): number {
    return this.data?.outs?.length ?? 0;
  }
  
  get hasIO(): boolean {
    return this.insCount > 0 || this.outsCount > 0;
  }
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: ModuleDetailDataService,
    public rackDataService: RackDetailDataService
  ) {}
  
  ngOnInit(): void {
    this.isInCollection$ = this.dataService.userModulesList$
                               .pipe(
                                  map(data => data.filter(x => x.id === this.data.id).length > 0),
                                  takeUntil(this.destroyEvent$)
                                );
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }

  onTagChooserOpenChange(isOpen: boolean): void {
    this.isTagChooserOpen = isOpen;
  }
}

export interface ModuleMinimalViewConfig {
  hideLabels: boolean;
  hideManufacturer: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
  hideTags: boolean;
  hidePanelsOptions: boolean;
  bigPanelImage: boolean;
  ellipseDescription: boolean;
  hidePatchedIn: boolean;
  hideRackedIn: boolean;
  hideBySameManufacturer: boolean;
  tagsShowCounts: boolean;
  tagsReadOnly: boolean;
  tagsMaxCount: number | null;
  hideIoCounts: boolean;
  hideReportIssue: boolean;
}

export const defaultModuleMinimalViewConfig: ModuleMinimalViewConfig = {
  hideLabels:         false,
  hideManufacturer:   false,
  hideDescription:    false,
  hideButtons:        false,
  hideHP:             false,
  hideDates:          false,
  hideTags:           false,
  hidePanelsOptions:  true,
  bigPanelImage:      false,
  ellipseDescription: true,
  hidePatchedIn: false,
  hideRackedIn: false,
  hideBySameManufacturer: false,
  tagsShowCounts: true,
  tagsReadOnly: false,
  tagsMaxCount: null,
  hideIoCounts: false,
  hideReportIssue: false,
};
