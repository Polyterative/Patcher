import {
  ChangeDetectionStrategy,
  Component,
  Inject
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';
import {
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import {
  USER_MODULE_ACQUISITION_CURRENCIES,
  USER_MODULE_ACQUISITION_SOURCES,
  UserModuleAcquisitionCurrency,
  UserModuleAcquisitionDraft,
  UserModuleAcquisitionSource
} from 'src/app/models/user-module-acquisition';
import { parseMarketplacePriceToMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';

export interface ModulePossessionDialogData {
  module: MinimalModule;
}

export interface ModulePossessionDialogResult {
  kind: UserModulePossessionKind;
  acquisition?: UserModuleAcquisitionDraft;
}

interface PossessionChoice {
  kind: UserModulePossessionKind;
  icon: string;
  label: string;
  helper: string;
}

@Component({
  selector: 'app-module-possession-dialog',
  templateUrl: './module-possession-dialog.component.html',
  styleUrls: ['./module-possession-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModulePossessionDialogComponent {
  readonly currencies = USER_MODULE_ACQUISITION_CURRENCIES;
  readonly sources = USER_MODULE_ACQUISITION_SOURCES;
  readonly choices: PossessionChoice[] = [
    {
      kind: 'HAS',
      icon: 'inventory_2',
      label: 'Owned',
      helper: "It's in your rack, on your desk, or ready to patch."
    },
    {
      kind: 'WANTS',
      icon: 'bookmark_add',
      label: 'Wanted',
      helper: "Keep it on your wishlist without treating it as owned gear."
    },
    {
      kind: 'SELLS',
      icon: 'sell',
      label: 'For sale',
      helper: 'You have one and want to sell or trade it. More listing details can come later.'
    }
  ];

  selectedKind: UserModulePossessionKind | null = null;
  acquiredAt = getTodayInputValue();
  priceInput = '';
  currency: UserModuleAcquisitionCurrency = 'EUR';
  source: UserModuleAcquisitionSource = 'unknown';
  note = '';
  priceError: string | null = null;

  get titleId(): string {
    return `module-possession-dialog-title-${this.data.module.id}`;
  }

  get descriptionId(): string {
    return `module-possession-dialog-description-${this.data.module.id}`;
  }

  constructor(
    public dialogRef: MatDialogRef<ModulePossessionDialogComponent, ModulePossessionDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ModulePossessionDialogData
  ) {}

  select(kind: UserModulePossessionKind): void {
    this.selectedKind = kind;
  }

  save(): void {
    if (!this.selectedKind) {
      return;
    }

    if (this.selectedKind !== 'HAS') {
      this.dialogRef.close({kind: this.selectedKind});
      return;
    }

    const acquisition = this.buildAcquisitionDraft();
    if (this.priceError) {
      return;
    }

    this.dialogRef.close(acquisition ? {kind: this.selectedKind, acquisition} : {kind: this.selectedKind});
  }

  private buildAcquisitionDraft(): UserModuleAcquisitionDraft | undefined {
    this.priceError = null;
    const trimmedPrice = this.priceInput.trim();
    const trimmedNote = this.note.trim();
    const priceAmountMinor = trimmedPrice
      ? parseMarketplacePriceToMinorUnits(trimmedPrice, this.currency)
      : undefined;

    if (trimmedPrice && priceAmountMinor === undefined) {
      this.priceError = 'Enter a valid non-negative price.';
      return undefined;
    }

    const hasMeaningfulAcquisitionData =
      priceAmountMinor !== undefined ||
      this.source !== 'unknown' ||
      !!trimmedNote ||
      this.acquiredAt !== getTodayInputValue();

    if (!hasMeaningfulAcquisitionData) {
      return undefined;
    }

    return {
      acquired_at: this.acquiredAt || getTodayInputValue(),
      price_amount_minor: priceAmountMinor ?? null,
      currency: priceAmountMinor === undefined ? null : this.currency,
      source: this.source,
      note: trimmedNote || null
    };
  }
}

function getTodayInputValue(): string {
  const now = new Date();
  const month = `${ now.getMonth() + 1 }`.padStart(2, '0');
  const day = `${ now.getDate() }`.padStart(2, '0');
  return `${ now.getFullYear() }-${ month }-${ day }`;
}
