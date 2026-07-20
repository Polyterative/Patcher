import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BehaviorSubject,
  combineLatest,
  Observable
} from 'rxjs';
import {
  map,
  startWith
} from 'rxjs/operators';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';
import {
  getMarketplaceDuplicateListingWarning,
  MarketplaceDuplicateListingWarningResult,
  MarketplaceListing,
  MarketplaceListingCondition,
  MarketplaceListingDraft,
  MarketplaceListingDraftField,
  MarketplaceListingDraftValidationResult,
  MarketplaceListingMedia,
  MarketplaceListingStatus,
  normalizeMarketplaceListingMediaDrafts,
  validateAndNormalizeMarketplaceListingDraft
} from 'src/app/features/marketplace/marketplace-listing.utils';
import { formatMarketplaceMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';
import { MinimalModule } from 'src/app/models/module';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  UserListingsDataService,
  UserListingsStatusFilter,
  UserListingsViewModel
} from './user-listings-data.service';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  createUserListingFields,
  listingOption,
  USER_LISTING_CONDITION_OPTIONS,
  USER_LISTING_CURRENCY_OPTIONS
} from './user-listings-fields.factory';

interface UserListingsEditorState {
  listingId: string | null;
  mode: 'create' | 'edit';
  moduleId: number;
}

interface UserListingsFilterOption {
  icon: string;
  label: string;
  value: UserListingsStatusFilter;
}

const OPEN_LISTING_STATUSES: MarketplaceListingStatus[] = ['active', 'reserved', 'paused', 'draft'];
const CLOSED_LISTING_STATUSES: MarketplaceListingStatus[] = ['closed_sold', 'closed_unsold', 'expired'];

@Component({
  selector: 'app-user-listings',
  standalone: true,
  templateUrl: './user-listings.component.html',
  styleUrl: './user-listings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserListingsDataService],
  imports: [
    CommonModule,
    EmptyStateTipsComponent,
    HeroContentCardComponent,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormEntityComponent,
    MatIconModule,
    MatTooltipModule,
    ReactiveFormsModule
  ]
})
export class UserListingsComponent extends SubManager implements OnInit {
  private readonly _editor$ = new BehaviorSubject<UserListingsEditorState | null>(null);
  private readonly _filter$ = new BehaviorSubject<UserListingsStatusFilter>('all');
  private readonly _pendingFiles$ = new BehaviorSubject<File[]>([]);
  private readonly _mediaValidationMessage$ = new BehaviorSubject<string | null>(null);

  readonly vm$: Observable<UserListingsViewModel>;
  readonly editor$ = this._editor$.asObservable();
  readonly filter$ = this._filter$.asObservable();
  readonly pendingFiles$ = this._pendingFiles$.asObservable();
  readonly mediaValidationMessage$ = this._mediaValidationMessage$.asObservable();
  readonly filters: UserListingsStatusFilter[] = ['all', 'active', 'draft', 'paused', 'closed'];
  readonly filterOptions: UserListingsFilterOption[] = [
    {value: 'all', label: 'All', icon: 'storefront'},
    {value: 'active', label: 'Active', icon: 'visibility'},
    {value: 'draft', label: 'Draft', icon: 'edit_note'},
    {value: 'paused', label: 'Paused', icon: 'pause_circle'},
    {value: 'closed', label: 'Closed', icon: 'task_alt'}
  ];

  readonly shippingOptionLabels = [
    {control: 'localPickup', label: 'Local pickup'},
    {control: 'domesticShipping', label: 'Domestic shipping'},
    {control: 'euShipping', label: 'EU shipping'},
    {control: 'internationalShipping', label: 'International shipping'}
  ] as const;

  readonly form = new FormGroup({
    askingPrice: new FormControl('', {nonNullable: true}),
    askingPriceCurrency: new FormControl<string | ISelectable>('EUR', {nonNullable: true}),
    condition: new FormControl<MarketplaceListingCondition | '' | ISelectable>('', {nonNullable: true}),
    description: new FormControl('', {nonNullable: true}),
    externalLink: new FormControl('', {nonNullable: true}),
    openToOffers: new FormControl(true, {nonNullable: true}),
    shipsFromCountry: new FormControl('', {nonNullable: true}),
    shippingNotes: new FormControl('', {nonNullable: true}),
    titleOverride: new FormControl('', {nonNullable: true}),
    shippingOptions: new FormGroup({
      domesticShipping: new FormControl(true, {nonNullable: true}),
      euShipping: new FormControl(false, {nonNullable: true}),
      internationalShipping: new FormControl(false, {nonNullable: true}),
      localPickup: new FormControl(false, {nonNullable: true})
    })
  });

  readonly listingFields = createUserListingFields({
    askingPrice: this.form.controls.askingPrice,
    askingPriceCurrency: this.form.controls.askingPriceCurrency,
    condition: this.form.controls.condition,
    description: this.form.controls.description,
    externalLink: this.form.controls.externalLink,
    shippingNotes: this.form.controls.shippingNotes,
    shipsFromCountry: this.form.controls.shipsFromCountry,
    titleOverride: this.form.controls.titleOverride
  });

  readonly filteredListings$: Observable<MarketplaceListing[]>;
  readonly availableModules$: Observable<MinimalModule[]>;
  readonly validation$: Observable<MarketplaceListingDraftValidationResult>;
  readonly duplicateWarning$: Observable<MarketplaceDuplicateListingWarningResult>;
  readonly canSave$: Observable<boolean>;

  constructor(readonly dataService: UserListingsDataService) {
    super();
    this.vm$ = this.dataService.vm$;
    const formChanges$ = this.form.valueChanges.pipe(startWith(this.form.getRawValue()));

    this.filteredListings$ = combineLatest([this.vm$, this.filter$]).pipe(
      map(([vm, filter]) => this.filterListings(vm.listings, filter))
    );
    this.availableModules$ = combineLatest([this.vm$, this.filter$]).pipe(
      map(([vm, filter]) => filter === 'all' ? this.modulesWithoutOpenListing(vm.eligibleModules, vm.listings) : [])
    );
    this.validation$ = combineLatest([formChanges$, this.vm$, this.editor$]).pipe(
      map(([, vm, editor]) => validateAndNormalizeMarketplaceListingDraft(this.formDraft(vm, editor, 'draft')))
    );
    this.duplicateWarning$ = combineLatest([formChanges$, this.vm$, this.editor$]).pipe(
      map(([, vm, editor]) => this.duplicateWarning(vm, editor))
    );
    this.canSave$ = combineLatest([this.validation$, this.duplicateWarning$, this.vm$]).pipe(
      map(([validation, duplicate, vm]) => validation.valid && !duplicate.hasDuplicate && !vm.busy)
    );

    this.dataService.saveSucceeded$.pipe(
      this.takeUntilDestroyed()
    ).subscribe(result => {
      this._pendingFiles$.next(result.failedFiles);
      if (result.partialError) {
        this._editor$.next({
          listingId: result.listing.id,
          mode: 'edit',
          moduleId: result.listing.moduleId
        });
        return;
      }
      this.closeEditor();
    });
  }

  ngOnInit(): void {
    this.dataService.load$.next();
  }

  setFilter(filter: UserListingsStatusFilter): void {
    this._filter$.next(filter);
  }

  openCreate(module: MinimalModule): void {
    this.resetForm(module);
    this._editor$.next({listingId: null, mode: 'create', moduleId: module.id});
  }

  openEdit(listing: MarketplaceListing): void {
    this.form.reset({
      askingPrice: this.priceInput(listing),
      askingPriceCurrency: this.currencyOption(listing.askingPriceCurrency),
      condition: this.conditionOption(listing.condition),
      description: listing.description ?? '',
      externalLink: listing.externalLink ?? '',
      openToOffers: listing.openToOffers,
      shipsFromCountry: listing.shipsFromCountry,
      shippingNotes: listing.shippingNotes ?? '',
      titleOverride: listing.titleOverride ?? '',
      shippingOptions: {
        domesticShipping: listing.shippingOptions.includes('Domestic shipping'),
        euShipping: listing.shippingOptions.includes('EU shipping'),
        internationalShipping: listing.shippingOptions.includes('International shipping'),
        localPickup: listing.shippingOptions.includes('Local pickup')
      }
    });
    this._pendingFiles$.next([]);
    this._mediaValidationMessage$.next(null);
    this._editor$.next({listingId: listing.id, mode: 'edit', moduleId: listing.moduleId});
  }

  closeEditor(): void {
    this._editor$.next(null);
    this._pendingFiles$.next([]);
    this._mediaValidationMessage$.next(null);
    this.resetForm();
  }

  save(status: MarketplaceListingStatus): void {
    const vm = this.dataService.snapshot;
    const editor = this._editor$.value;
    const duplicate = this.duplicateWarning(vm, editor);
    const validation = validateAndNormalizeMarketplaceListingDraft(this.formDraft(vm, editor, status));

    if (!editor || !validation.valid || duplicate.hasDuplicate || vm.busy) {
      this._mediaValidationMessage$.next(
        duplicate.hasDuplicate ? duplicate.message : 'Fix listing fields before saving.'
      );
      return;
    }

    this.dataService.save$.next({
      id: editor.listingId,
      draft: this.formDraft(vm, editor, status),
      files: this._pendingFiles$.value
    });
  }

  changeLifecycle(listing: MarketplaceListing, status: MarketplaceListingStatus): void {
    this.dataService.lifecycle$.next({listing, status});
  }

  deleteMedia(listing: MarketplaceListing, media: MarketplaceListingMedia): void {
    this.dataService.mediaDelete$.next({listing, media});
  }

  moveMedia(listing: MarketplaceListing, media: MarketplaceListingMedia, direction: -1 | 1): void {
    this.dataService.mediaMove$.next({listing, media, direction});
  }

  onFilesSelected(event: Event, listing: MarketplaceListing | null): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (files.length === 0) {
      return;
    }

    const existingMedia = listing?.media ?? [];
    const currentPending = this._pendingFiles$.value;
    const nextFiles = [...currentPending, ...files];
    const normalized = normalizeMarketplaceListingMediaDrafts([
      ...existingMedia.map(media => ({
        id: media.id,
        mimeType: media.mimeType,
        position: media.position
      })),
      ...nextFiles.map((file, index) => ({
        filename: file.name,
        mimeType: file.type,
        position: existingMedia.length + index,
        sizeBytes: file.size
      }))
    ]);

    if (normalized.errors.length > 0 || existingMedia.length + nextFiles.length > 8) {
      this._mediaValidationMessage$.next(
        normalized.errors[0]?.message ?? 'Marketplace listings support at most 8 images.'
      );
      return;
    }

    this._pendingFiles$.next(nextFiles);
    this._mediaValidationMessage$.next(
      'Images will upload after the listing draft is saved. Text-only active listings are allowed; images are recommended.'
    );
  }

  clearPendingFile(index: number): void {
    this._pendingFiles$.next(this._pendingFiles$.value.filter((_, fileIndex) => fileIndex !== index));
  }

  retryLoad(): void {
    this.dataService.load$.next();
  }

  normalizeCountryInput(): void {
    this.form.controls.shipsFromCountry.setValue(this.form.controls.shipsFromCountry.value.trim().toUpperCase());
  }

  normalizeCurrencyInput(): void {
    const currency = this.selectableValue(this.form.controls.askingPriceCurrency.value);
    this.form.controls.askingPriceCurrency.setValue(currency.trim().toUpperCase());
  }

  titleForListing(listing: MarketplaceListing): string {
    return listing.titleOverride || listing.module?.name || `Module #${listing.moduleId}`;
  }

  manufacturerForListing(listing: MarketplaceListing): string {
    return listing.module?.manufacturer?.name ?? 'Unknown manufacturer';
  }

  manufacturerForModule(module: MinimalModule): string {
    return module.manufacturer?.name ?? 'Unknown manufacturer';
  }

  priceForListing(listing: MarketplaceListing): string {
    return formatMarketplaceMinorUnits(listing.askingPriceAmountMinor, listing.askingPriceCurrency);
  }

  statusLabel(status: MarketplaceListingStatus): string {
    return status.replace(/_/g, ' ');
  }

  sortedMedia(listing: MarketplaceListing): MarketplaceListingMedia[] {
    return [...listing.media].sort((first, second) => first.position - second.position);
  }

  listingForEditor(vm: UserListingsViewModel, editor: UserListingsEditorState | null): MarketplaceListing | null {
    return editor?.listingId ? vm.listings.find(listing => listing.id === editor.listingId) ?? null : null;
  }

  moduleForEditor(vm: UserListingsViewModel, editor: UserListingsEditorState | null): MinimalModule | null {
    return editor ? vm.eligibleModules.find(module => module.id === editor.moduleId) ?? null : null;
  }

  canPublish(listing: MarketplaceListing): boolean {
    return listing.status === 'draft' || listing.status === 'paused';
  }

  canPause(listing: MarketplaceListing): boolean {
    return listing.status === 'active' || listing.status === 'reserved';
  }

  canClose(listing: MarketplaceListing): boolean {
    return !CLOSED_LISTING_STATUSES.includes(listing.status);
  }

  fieldError(
    validation: MarketplaceListingDraftValidationResult | null,
    field: MarketplaceListingDraftField
  ): string | null {
    return validation?.valid === false ? validation.errors[field] ?? null : null;
  }

  showFieldError(
    validation: MarketplaceListingDraftValidationResult | null,
    field: MarketplaceListingDraftField,
    control: AbstractControl
  ): string | null {
    return control.touched || control.dirty ? this.fieldError(validation, field) : null;
  }

  private resetForm(module?: MinimalModule): void {
    this.form.reset({
      askingPrice: '',
      askingPriceCurrency: this.currencyOption('EUR'),
      condition: '',
      description: '',
      externalLink: '',
      openToOffers: true,
      shipsFromCountry: '',
      shippingNotes: '',
      titleOverride: module?.name ?? '',
      shippingOptions: {
        domesticShipping: true,
        euShipping: false,
        internationalShipping: false,
        localPickup: false
      }
    });
  }

  private formDraft(
    vm: UserListingsViewModel,
    editor: UserListingsEditorState | null,
    status: MarketplaceListingStatus
  ): MarketplaceListingDraft {
    const value = this.form.getRawValue();
    return {
      askingPrice: value.askingPrice,
      askingPriceCurrency: this.selectableValue(value.askingPriceCurrency),
      condition: this.selectableValue(value.condition) as MarketplaceListingCondition | '',
      description: value.description,
      externalLink: value.externalLink,
      moduleId: editor ? String(editor.moduleId) : null,
      openToOffers: value.openToOffers,
      sellerProfileId: vm.sellerProfileId,
      shippingNotes: value.shippingNotes,
      shippingOptions: this.selectedShippingOptions(),
      shipsFromCountry: value.shipsFromCountry,
      status,
      titleOverride: value.titleOverride
    };
  }

  private selectedShippingOptions(): string[] {
    const options = this.form.controls.shippingOptions.getRawValue();
    return this.shippingOptionLabels
      .filter(option => options[option.control])
      .map(option => option.label);
  }

  private duplicateWarning(
    vm: UserListingsViewModel,
    editor: UserListingsEditorState | null
  ): MarketplaceDuplicateListingWarningResult {
    if (!editor) {
      return {hasDuplicate: false};
    }

    return getMarketplaceDuplicateListingWarning(
      vm.listings
        .filter(listing => listing.id !== editor.listingId)
        .map(listing => ({
          id: listing.id,
          moduleId: String(listing.moduleId),
          publicId: listing.publicId,
          sellerProfileId: listing.sellerProfileId,
          status: listing.status,
          titleOverride: listing.titleOverride
        })),
      {
        moduleId: String(editor.moduleId),
        sellerProfileId: vm.sellerProfileId
      }
    );
  }

  private selectableValue(value: string | ISelectable): string {
    return typeof value === 'string' ? value : value.id;
  }

  private conditionOption(condition: MarketplaceListingCondition): ISelectable {
    return USER_LISTING_CONDITION_OPTIONS.find(option => option.id === condition) ?? listingOption(condition);
  }

  private currencyOption(currency: string): ISelectable {
    return USER_LISTING_CURRENCY_OPTIONS.find(option => option.id === currency) ?? listingOption(currency);
  }

  private modulesWithoutOpenListing(modules: MinimalModule[], listings: MarketplaceListing[]): MinimalModule[] {
    const listedModuleIds = new Set(
      listings
        .filter(listing => OPEN_LISTING_STATUSES.includes(listing.status))
        .map(listing => listing.moduleId)
    );
    return modules.filter(module => !listedModuleIds.has(module.id));
  }

  private filterListings(
    listings: MarketplaceListing[],
    filter: UserListingsStatusFilter
  ): MarketplaceListing[] {
    if (filter === 'all') {
      return listings;
    }
    if (filter === 'closed') {
      return listings.filter(listing => CLOSED_LISTING_STATUSES.includes(listing.status));
    }
    return listings.filter(listing => listing.status === filter);
  }

  private priceInput(listing: MarketplaceListing): string {
    const formatted = formatMarketplaceMinorUnits(listing.askingPriceAmountMinor, listing.askingPriceCurrency, 'en-US');
    return formatted.replace(/[^\d.,]/gu, '');
  }
}
