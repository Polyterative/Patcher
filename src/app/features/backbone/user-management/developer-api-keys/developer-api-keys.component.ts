import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit
} from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  AsyncPipe,
  DatePipe,
  DecimalPipe,
  NgIf,
  TitleCasePipe
} from '@angular/common';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  distinctUntilChanged,
  map,
  takeUntil
} from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  API_KEY_LABEL_MAX_LENGTH,
  API_KEY_LABEL_PATTERN,
  DeveloperApiKeysDataService,
  DeveloperApiKeysViewModel
} from './developer-api-keys-data.service';

@Component({
  selector: 'app-developer-api-keys',
  standalone: true,
  templateUrl: './developer-api-keys.component.html',
  styleUrls: ['./developer-api-keys.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DeveloperApiKeysDataService],
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    MatButton,
    MatError,
    MatFormField,
    MatHint,
    MatIcon,
    MatInput,
    MatLabel,
    NgIf,
    ReactiveFormsModule,
    TitleCasePipe
  ]
})
export class DeveloperApiKeysComponent extends SubManager implements OnInit {
  developerApiEnabled = environment.features.developerApiEnabled;

  readonly dataService = inject(DeveloperApiKeysDataService);
  readonly vm$ = this.dataService.vm$;
  readonly labelControl = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(API_KEY_LABEL_MAX_LENGTH),
      Validators.pattern(API_KEY_LABEL_PATTERN)
    ]
  });

  private currentSlotId: string | null = null;

  constructor() {
    super();
    this.initializeLabelSync();
  }

  ngOnInit(): void {
    this.dataService.load$.next();
  }

  submitCreateOrRotate(vm: DeveloperApiKeysViewModel): void {
    this.labelControl.markAsTouched();
    this.labelControl.updateValueAndValidity();
    if (this.labelControl.invalid) {
      return;
    }

    if (vm.slot?.active && !vm.rotateConfirmationVisible) {
      this.dataService.requestRotateConfirmation$.next();
      return;
    }

    this.labelControl.markAsPristine();
    this.dataService.createOrRotate$.next({ label: this.labelControl.value });
  }

  cancelRotation(): void {
    this.dataService.cancelRotateConfirmation$.next();
  }

  requestRevoke(id: string): void {
    this.dataService.requestRevokeConfirmation$.next(id);
  }

  confirmRevoke(id: string): void {
    this.dataService.revoke$.next({ id });
  }

  cancelRevoke(): void {
    this.dataService.cancelRevokeConfirmation$.next();
  }

  copyReveal(): void {
    this.dataService.copyRevealedKey$.next();
  }

  dismissReveal(): void {
    this.dataService.dismissReveal$.next();
  }

  reload(): void {
    this.dataService.load$.next();
  }

  private initializeLabelSync(): void {
    this.vm$.pipe(
      map(vm => vm.slot),
      distinctUntilChanged((previous, next) =>
        previous?.id === next?.id
        && previous?.label === next?.label
        && previous?.active === next?.active
      ),
      takeUntil(this.destroy$)
    ).subscribe(slot => {
      const slotChanged = this.currentSlotId !== (slot?.id ?? null);
      this.currentSlotId = slot?.id ?? null;
      if (!slot || slotChanged || !this.labelControl.dirty) {
        this.labelControl.setValue(slot?.label ?? '');
        this.labelControl.markAsPristine();
        this.labelControl.markAsUntouched();
      }
    });
  }
}
