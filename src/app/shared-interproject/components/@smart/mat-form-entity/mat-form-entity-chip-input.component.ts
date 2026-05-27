import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import {
  MatChipInputEvent,
  MatChipsModule
} from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import {
  AppEnterKeyHint,
  AppInputMode,
  FormTypes,
  ISelectable
} from './form-element-models';

@Component({
  selector: 'lib-mat-form-entity-chip-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule
  ],
  templateUrl: './mat-form-entity-chip-input.component.html'
})
export class MatFormEntityChipInputComponent {
  @Input({required: true}) type!: FormTypes;
  @Input({required: true}) types = FormTypes;
  @Input({required: true}) control!: UntypedFormControl;
  @Input() ghostControl?: UntypedFormControl;
  @Input() placeholder = '';
  @Input() resolvedInputMode: AppInputMode | null = null;
  @Input() resolvedEnterKeyHint: AppEnterKeyHint | null = null;
  @Input() autocompleteSeparatorKeysCodes: number[] = [];
  @Input() optionsFiltered: Observable<ISelectable[]> | null = null;
  @Input() controlDisabled = false;

  @Output() removeChip = new EventEmitter<ISelectable>();
  @Output() addMultiText = new EventEmitter<MatChipInputEvent>();
  @Output() cleanMultiComplete = new EventEmitter<MatChipInputEvent>();
  @Output() addMultiComplete = new EventEmitter<MatAutocompleteSelectedEvent>();
  @Output() inputEnter = new EventEmitter<KeyboardEvent>();
}
