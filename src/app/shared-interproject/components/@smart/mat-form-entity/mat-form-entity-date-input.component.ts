import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FloatLabelType, MatFormFieldAppearance, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule, TooltipPosition } from '@angular/material/tooltip';

@Component({
  selector: 'lib-mat-form-entity-date-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './mat-form-entity-date-input.component.html'
})
export class MatFormEntityDateInputComponent {
  @Input({required: true}) control!: UntypedFormControl;
  @Input({required: true}) label = '';
  @Input() iconL1?: string;
  @Input() placeholder = '';
  @Input() invalid = false;
  @Input() errors = '';
  @Input() dateMin?: Date;
  @Input() dateMax?: Date;
  @Input() dateOpenPosition: Date = new Date();
  @Input() resolvedEnterKeyHint: string | null = null;
  @Input() formFieldAppearanceType: MatFormFieldAppearance = 'outline';
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() hideRequiredMarker = false;
  @Input() tooltip = '';
  @Input() tooltipPosition: TooltipPosition = 'below';

  @Output() inputEnter = new EventEmitter<KeyboardEvent>();
}
