import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';
import { MaintenanceAdminImagesService } from './maintenance-admin-images.service';
import { MaintenanceModeService } from './maintenance-mode.service';


/** Thin, non-dismissable strip shown on every page while maintenance mode is on. */
@Component({
  selector: 'app-maintenance-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    @if (maintenance.enabled) {
      <div class="maintenance-banner" role="status">
        <strong>Maintenance mode</strong>
        <span>Database maintenance in progress.</span>
        @if (maintenance.isAdmin$ | async) {
          <span class="maintenance-banner__admin">Admin bypass active.</span>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .maintenance-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.25rem 0.75rem;
      padding: 0.375rem 1rem;
      font-size: 0.8125rem;
      line-height: 1.4;
      background-color: var(--mat-sys-surface-container-high, #e8e7ee);
      color: var(--mat-sys-on-surface, #1b1b1f);
      border-bottom: 1px solid var(--mat-sys-outline-variant, #c6c6d0);
    }
    .maintenance-banner__admin { opacity: 0.8; }
  `]
})
export class MaintenanceBannerComponent {
  readonly maintenance = inject(MaintenanceModeService);

  constructor() {
    inject(MaintenanceAdminImagesService).start();
  }
}
