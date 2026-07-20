import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  BehaviorSubject,
  combineLatest,
  Observable
} from 'rxjs';
import {
  map,
  startWith
} from 'rxjs/operators';
import {
  buildMarketplaceAddressPrivateSummary,
  MarketplaceSavedShippingAddress,
  MarketplaceShippingAddressDraft,
  MarketplaceShippingAddressField,
  MarketplaceShippingAddressValidationResult,
  validateMarketplaceShippingAddressDraft
} from 'src/app/features/marketplace/marketplace-address-book.utils';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  UserAddressBookDataService,
  UserAddressBookViewModel
} from './user-address-book-data.service';

interface UserAddressBookEditorState {
  id: string | null;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-user-address-book',
  standalone: true,
  templateUrl: './user-address-book.component.html',
  styleUrl: './user-address-book.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserAddressBookDataService],
  imports: [
    CommonModule,
    EmptyStateTipsComponent,
    HeroContentCardComponent,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule
  ]
})
export class UserAddressBookComponent extends SubManager implements OnInit {
  private readonly _editor$ = new BehaviorSubject<UserAddressBookEditorState | null>(null);
  private readonly _deleteConfirmId$ = new BehaviorSubject<string | null>(null);

  readonly vm$: Observable<UserAddressBookViewModel>;
  readonly editor$ = this._editor$.asObservable();
  readonly deleteConfirmId$ = this._deleteConfirmId$.asObservable();
  readonly form = new FormGroup({
    city: new FormControl('', {nonNullable: true}),
    countryCode: new FormControl('', {nonNullable: true}),
    isDefault: new FormControl(false, {nonNullable: true}),
    label: new FormControl('', {nonNullable: true}),
    line1: new FormControl('', {nonNullable: true}),
    line2: new FormControl('', {nonNullable: true}),
    postalCode: new FormControl('', {nonNullable: true}),
    recipientName: new FormControl('', {nonNullable: true}),
    region: new FormControl('', {nonNullable: true})
  });

  readonly validation$ = this.form.valueChanges.pipe(
    startWith(this.form.getRawValue()),
    map(() => validateMarketplaceShippingAddressDraft(this.formDraft()))
  );

  readonly canSave$: Observable<boolean>;

  constructor(readonly dataService: UserAddressBookDataService) {
    super();
    this.vm$ = this.dataService.vm$;
    this.canSave$ = combineLatest([this.validation$, this.vm$]).pipe(
      map(([validation, vm]) => validation.valid && !vm.saving && !vm.deletingId)
    );

    this.dataService.saveSucceeded$.pipe(
      this.takeUntilDestroyed()
    ).subscribe(saved => {
      const editor = this._editor$.value;
      if (editor?.mode === 'create' || editor?.id === saved.id) {
        this.closeEditor();
      }
    });

    this.dataService.deleteSucceeded$.pipe(
      this.takeUntilDestroyed()
    ).subscribe(addressId => {
      if (this._editor$.value?.id === addressId) {
        this.closeEditor();
      }
      if (this._deleteConfirmId$.value === addressId) {
        this.cancelDelete();
      }
    });
  }

  ngOnInit(): void {
    this.dataService.load$.next();
  }

  openCreate(): void {
    const firstAddress = this.dataService.snapshot.addresses.length === 0;
    this.form.reset({
      city: '',
      countryCode: '',
      isDefault: firstAddress,
      label: '',
      line1: '',
      line2: '',
      postalCode: '',
      recipientName: '',
      region: ''
    });
    this._deleteConfirmId$.next(null);
    this._editor$.next({id: null, mode: 'create'});
  }

  openEdit(address: MarketplaceSavedShippingAddress): void {
    this.form.reset({
      city: address.city,
      countryCode: address.countryCode,
      isDefault: address.isDefault,
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? '',
      postalCode: address.postalCode ?? '',
      recipientName: address.recipientName,
      region: address.region ?? ''
    });
    this._deleteConfirmId$.next(null);
    this._editor$.next({id: address.id, mode: 'edit'});
  }

  closeEditor(): void {
    this._editor$.next(null);
    this.form.reset({
      city: '',
      countryCode: '',
      isDefault: false,
      label: '',
      line1: '',
      line2: '',
      postalCode: '',
      recipientName: '',
      region: ''
    });
  }

  save(): void {
    const editor = this._editor$.value;
    const validation = validateMarketplaceShippingAddressDraft(this.formDraft());

    if (!editor || !validation.valid || this.dataService.snapshot.saving || this.dataService.snapshot.deletingId) {
      return;
    }

    this.dataService.save$.next({
      id: editor.id,
      draft: this.formDraft()
    });
  }

  requestDelete(address: MarketplaceSavedShippingAddress): void {
    this._deleteConfirmId$.next(address.id);
  }

  confirmDelete(address: MarketplaceSavedShippingAddress): void {
    this.dataService.delete$.next(address);
  }

  cancelDelete(): void {
    this._deleteConfirmId$.next(null);
  }

  makeDefault(address: MarketplaceSavedShippingAddress): void {
    this.dataService.setDefault$.next(address);
  }

  retryLoad(): void {
    this.dataService.load$.next();
  }

  normalizeCountryInput(): void {
    const value = this.form.controls.countryCode.value.trim().toUpperCase();
    this.form.controls.countryCode.setValue(value);
  }

  summary(address: MarketplaceSavedShippingAddress): string {
    return buildMarketplaceAddressPrivateSummary(address);
  }

  fieldError(
    validation: MarketplaceShippingAddressValidationResult | null,
    field: MarketplaceShippingAddressField
  ): string | null {
    return validation?.errors[field] ?? null;
  }

  private formDraft(): MarketplaceShippingAddressDraft {
    const value = this.form.getRawValue();

    return {
      city: value.city,
      countryCode: value.countryCode,
      isDefault: value.isDefault,
      label: value.label,
      line1: value.line1,
      line2: value.line2,
      postalCode: value.postalCode,
      recipientName: value.recipientName,
      region: value.region
    };
  }
}
