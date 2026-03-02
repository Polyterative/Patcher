import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { AutoContentLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { CleanCardModule } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.module';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { ManufacturerUpdatedBadgeComponent } from './manufacturer-updated-badge/manufacturer-updated-badge.component';


@Component({
  selector: 'app-manufacturer-row',
  templateUrl: './manufacturer-row.component.html',
  styleUrls: ['./manufacturer-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    AutoContentLoadingIndicatorModule,
    CleanCardModule,
    ModulePartsModule,
    ManufacturerUpdatedBadgeComponent
  ]
})
export class ManufacturerRowComponent extends SubManager implements OnInit {
  @Input() manufacturer!: ManufacturerDetail;

  private readonly _modules$ = new BehaviorSubject<ModuleList>(null);
  readonly modules$ = this._modules$.asObservable();

  readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideDescription: true,
    hideManufacturer: true,
    hideLabels: true,
    hideTags: true,
    hidePatchedIn: true,
    hideRackedIn: true,
    hideBySameManufacturer: true,
    ellipseDescription: true,
    tagsReadOnly: true,
    tagsShowCounts: false,
    tagsMaxCount: 0,
  };
  
  constructor(private readonly backend: SupabaseService) {
    super();
  }

  ngOnInit(): void {
    this.backend.get.modulesBySameManufacturer(this.manufacturer.id, 0, 29)
      .pipe(takeUntil(this.destroy$))
      .subscribe(modules => this._modules$.next(modules ?? []));
  }
}