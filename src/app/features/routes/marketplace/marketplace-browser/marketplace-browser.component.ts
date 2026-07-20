import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { MarketplaceBrowseFilters } from 'src/app/features/marketplace/marketplace-view-models';
import { MarketplaceListingCardComponent } from 'src/app/features/marketplace/marketplace-listing-card/marketplace-listing-card.component';
import { MarketplaceBrowserDataService } from './marketplace-browser-data.service';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrowserResetFiltersButtonComponent } from 'src/app/shared-interproject/components/@visual/browser-reset-filters-button/browser-reset-filters-button.component';

@Component({
  selector: 'app-marketplace-browser',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    BrowserResetFiltersButtonComponent,
    HeroContentCardComponent,
    MarketplaceListingCardComponent,
    MatButtonModule,
    MatChipsModule,
    MatFormEntityComponent,
    MatIconModule,
    RouterLink
  ],
  providers: [MarketplaceBrowserDataService],
  templateUrl: './marketplace-browser.component.html',
  styleUrl: './marketplace-browser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceBrowserComponent extends SubManager implements OnInit {
  readonly vm$: MarketplaceBrowserDataService['vm$'];
  mobileFiltersExpanded = false;

  constructor(readonly dataService: MarketplaceBrowserDataService, public userService: UserManagementService) {
    super();
    this.vm$ = this.dataService.vm$;
  }

  ngOnInit(): void {
    this.dataService.load$.next();
  }

  updateFilter(key: keyof MarketplaceBrowseFilters, value: string): void {
    this.dataService.setFilter$.next({key, value});
  }

  clearFilter(key: keyof MarketplaceBrowseFilters): void {
    this.updateFilter(key, '');
  }

  toggleMobileFilters(): void {
    this.mobileFiltersExpanded = !this.mobileFiltersExpanded;
  }

}
