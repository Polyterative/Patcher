import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
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
  filter,
  takeUntil
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import {
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import { MatDialog } from '@angular/material/dialog';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { ModuleDetailDataService } from '../module-detail-data.service';
import { ModulePossessionDialogComponent } from '../module-possession-dialog/module-possession-dialog.component';


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
export class ModuleMinimalComponent extends SubManager implements OnInit, OnDestroy {
  @Input() data: MinimalModule;
  @Input() viewConfig: ModuleMinimalViewConfig;
  /** Optional suffix shown inline next to the module name (e.g. instance label) */
  @Input() nameSuffix: string | undefined = undefined;
  @Input() preferredPanelColor: number | null = null;
  @Input() portraitDetailSplit = false;
  isTagChooserOpen = false;

  isInCollection$: Observable<boolean>;
  possessionKind$: Observable<UserModulePossessionKind | null>;
  
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
    public rackDataService: RackDetailDataService,
    private dialog: MatDialog
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.isInCollection$ = this.dataService.userModulesList$
      .pipe(
        map(data => {
          const row = data.find(module => module.id === this.data.id);
          return row?.possessionKind === 'HAS' || row?.possessionKind === 'SELLS';
        }),
        this.takeUntilDestroyed()
      );

    this.possessionKind$ = this.dataService.userModulesList$.pipe(
      map(data => {
        const row = data.find(module => module.id === this.data.id);
        return row?.possessionKind ?? null;
      }),
      this.takeUntilDestroyed()
    );
  }
  
  ngOnDestroy(): void {
    super.ngOnDestroy();
    
  }

  onTagChooserOpenChange(isOpen: boolean): void {
    this.isTagChooserOpen = isOpen;
  }

  openPossessionDialog(): void {
    this.dialog.open<ModulePossessionDialogComponent, { module: MinimalModule }, UserModulePossessionKind | undefined>(
      ModulePossessionDialogComponent,
      {
        width: '34rem',
        maxWidth: '95vw',
        data: {
          module: this.data
        },
        ariaLabel: 'Add module to your collection'
      }
    )
      .afterClosed()
      .pipe(
        filter((kind): kind is UserModulePossessionKind => !!kind),
        this.takeUntilDestroyed()
      )
      .subscribe(kind => this.dataService.setModulePossession$.next(kind));
  }

  removePossession(kind: UserModulePossessionKind | null): void {
    if (kind !== 'SELLS') {
      this.dataService.setModulePossession$.next(null);
      return;
    }

    const data: ConfirmDialogDataInModel = {
      title: 'Remove for-sale status?',
      description: 'This will remove the module from your collection state. Any future sale details would be cleared too.',
      negative: {label: 'Cancel'},
      positive: {label: 'Remove'}
    };

    this.dialog.open<ConfirmDialogComponent, ConfirmDialogDataInModel, ConfirmDialogDataOutModel>(
      ConfirmDialogComponent,
      {data}
    )
      .afterClosed()
      .pipe(
        filter(result => result?.answer === true),
        this.takeUntilDestroyed()
      )
      .subscribe(() => this.dataService.setModulePossession$.next(null));
  }

  getPossessionLabel(kind: UserModulePossessionKind | null | undefined): string | null {
    switch (kind) {
      case 'HAS':
        return 'Owned';
      case 'WANTS':
        return 'Wanted';
      case 'SELLS':
        return 'For sale';
      default:
        return null;
    }
  }

  getRemovePossessionTooltip(kind: UserModulePossessionKind | null | undefined): string {
    const label = this.getPossessionLabel(kind);
    return label
      ? `Current status: ${ label }. Click to remove this module from your collection.`
      : 'Remove from your collection';
  }

  shouldShowPanelVariantsBadge(): boolean {
    return (this.data?.panels?.length ?? 0) > 1 && !this.viewConfig?.hidePanelsOptions;
  }

  shouldRenderActionFooter(
    singleModuleData: MinimalModule | undefined,
    currentRackData: RackMinimal | undefined,
    isCurrentRackEditable: boolean | undefined
  ): boolean {
    return !!singleModuleData || (!!currentRackData && !!isCurrentRackEditable);
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
  colorTagsByAxis?: boolean;
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
  colorTagsByAxis: false,
  hideIoCounts: false,
  hideReportIssue: false,
};
