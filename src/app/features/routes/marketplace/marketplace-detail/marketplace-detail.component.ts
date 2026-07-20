import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import {
  BehaviorSubject,
  combineLatest
} from 'rxjs';
import {
  map,
  startWith,
  takeUntil
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { MarketplaceDetailDataService } from './marketplace-detail-data.service';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';

@Component({
  selector: 'app-marketplace-detail',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    HeroContentCardComponent,
    MatButtonModule,
    MatIconModule,
    ModulePartsModule,
    RouterLink
  ],
  providers: [MarketplaceDetailDataService],
  templateUrl: './marketplace-detail.component.html',
  styleUrl: './marketplace-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceDetailComponent extends SubManager implements OnInit {
  private readonly _selectedMediaIndex$ = new BehaviorSubject<number>(0);

  readonly vm$: MarketplaceDetailDataService['vm$'];
  readonly selectedMediaIndex$ = this._selectedMediaIndex$.asObservable();
  readonly selectedMedia$;
  readonly isLoggedIn$;

  constructor(
    readonly dataService: MarketplaceDetailDataService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly userService: UserManagementService
  ) {
    super();
    this.vm$ = this.dataService.vm$;
    this.selectedMedia$ = combineLatest([this.vm$, this.selectedMediaIndex$]).pipe(
      map(([vm, index]) => vm.listing?.media[index] ?? vm.listing?.media[0] ?? null)
    );
    this.isLoggedIn$ = this.userService.loggedUser$.pipe(
      map(user => !!user),
      startWith(false)
    );
  }

  get currentUrl(): string {
    return this.router.url;
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => params.get('publicId')),
      takeUntil(this.destroy$)
    ).subscribe(publicId => {
      if (publicId) {
        this._selectedMediaIndex$.next(0);
        this.dataService.loadListing$.next(publicId);
      }
    });
  }

  selectMedia(index: number): void {
    this._selectedMediaIndex$.next(index);
  }

  selectAdjacentMedia(direction: -1 | 1, mediaCount: number): void {
    if (mediaCount <= 0) {
      return;
    }
    const current = this._selectedMediaIndex$.value;
    this._selectedMediaIndex$.next((current + direction + mediaCount) % mediaCount);
  }
}
