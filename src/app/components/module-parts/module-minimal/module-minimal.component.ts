import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit, OnDestroy,
  Output,
} from '@angular/core';
import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  Observable,
} from 'rxjs';
import {
  map,
  filter,
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import { MatDialog } from '@angular/material/dialog';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { ModuleDetailDataService } from '../module-detail-data.service';
import {
  ModulePossessionDialogComponent,
  ModulePossessionDialogResult
} from '../module-possession-dialog/module-possession-dialog.component';
import { ReactionEntityTypes } from 'src/app/features/backend/supabase-reactions';
import {
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary
} from 'src/app/features/backend/supabase-queries';
import { type CoolToggleResult } from 'src/app/components/shared-atoms/cool-button/cool-button-data.service';


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
  @Input() showCoolAction = false;
  @Input() priceSummary: ModuleRecentMarketPrice | null | undefined = undefined;
  @Input() priceHistorySummary: ModuleSparsePriceHistorySummary | null | undefined = undefined;
  @Output() coolToggled = new EventEmitter<CoolToggleResult>();
  readonly ReactionEntityTypes = ReactionEntityTypes;
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

  get priceSummaryLabel(): string {
    return this.priceSummary?.displayPrice ?? '';
  }

  get priceBadgeLabel(): string {
    const priceLabel = this.priceSummaryLabel;
    if (!priceLabel) {
      return '';
    }
    return this.priceHistorySummary?.label
      ? `${ priceLabel } · ${ this.priceHistorySummary.label }`
      : priceLabel;
  }

  get priceSummaryTooltip(): string {
    return [
      this.priceSummary?.tooltip,
      this.priceHistorySummary?.tooltip
    ].filter(Boolean).join(' ');
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

  openPossessionDialog(initialKind: UserModulePossessionKind | null = null): void {
    this.dialog.open<ModulePossessionDialogComponent, { module: MinimalModule; initialKind: UserModulePossessionKind | null }, ModulePossessionDialogResult | null | undefined>(
      ModulePossessionDialogComponent,
      {
        width: '34rem',
        maxWidth: '95vw',
        data: {
          module: this.data,
          initialKind
        },
        ariaLabel: initialKind ? 'Manage module collection status' : 'Add module to your collection'
      }
    )
      .afterClosed()
      .pipe(
        filter((result): result is ModulePossessionDialogResult | null => result !== undefined),
        this.takeUntilDestroyed()
      )
      .subscribe(result => this.dataService.setModulePossession$.next(result));
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

  getPossessionActionTooltip(kind: UserModulePossessionKind | null | undefined): string {
    const label = this.getPossessionLabel(kind);
    return label
      ? `Current status: ${ label }. Click to change or remove this module from your collection.`
      : 'Add module to your collection';
  }

  getPossessionActionIcon(kind: UserModulePossessionKind | null | undefined): string {
    return kind ? 'edit_note' : 'add';
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
  highlightDescriptionKeywords?: boolean;
  showDescriptionAnalysis?: boolean;
  showFrequencyAnalysis?: boolean;
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
  highlightDescriptionKeywords: false,
  showDescriptionAnalysis: false,
  showFrequencyAnalysis: false,
  hideIoCounts: false,
  hideReportIssue: false,
};
