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

export interface ModulePossessionDialogData {
  module: MinimalModule;
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

  get titleId(): string {
    return `module-possession-dialog-title-${this.data.module.id}`;
  }

  get descriptionId(): string {
    return `module-possession-dialog-description-${this.data.module.id}`;
  }

  constructor(
    public dialogRef: MatDialogRef<ModulePossessionDialogComponent, UserModulePossessionKind | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ModulePossessionDialogData
  ) {}

  select(kind: UserModulePossessionKind): void {
    this.selectedKind = kind;
  }

  save(): void {
    if (!this.selectedKind) {
      return;
    }

    this.dialogRef.close(this.selectedKind);
  }
}
