import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output, OnDestroy
} from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  takeUntil
} from 'rxjs/operators';
import { PatchConnection } from 'src/app/models/connection';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';


@Component({
  selector: 'app-patch-connection-minimal',
  templateUrl: './patch-connection-minimal.component.html',
  styleUrls: ['./patch-connection-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchConnectionMinimalComponent implements OnInit, OnDestroy {
  @Input() index?: number;
  @Input() data: PatchConnection;
  @Input() isEditing = false;
  @Input() isCreator = false;
  @Input() confirmed: boolean | null = null;
  /** Map from instance ID → display label (e.g. "(1)"). Only set for multi-instance modules. */
  @Input() instanceLabelMap: Map<number, string> = new Map();
  @Input() showDeselectButtons = false;
  @Output() readonly remove$ = new EventEmitter<PatchConnection>();
  @Output() readonly create$ = new EventEmitter<PatchConnection>();
  @Output() readonly deselectA$ = new EventEmitter<void>();
  @Output() readonly deselectB$ = new EventEmitter<void>();
  /** Injected from patch-connections-list; emits the connection whose notes changed for backend sync. */
  @Input() readonly noteSync$?: Subject<PatchConnection>;
  types = FormTypes;
  
  @Input() viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels:       false,
    hideManufacturer: true,
    hideDescription:  true,
    hideButtons:      true,
    hideHP:           true,
    hideDates:        true,
    hideTags: true,
  };
  
  notes = {
    control: new UntypedFormControl('', Validators.compose([
      Validators.min(0),
      Validators.max(144)
    ]))
  };
  
  protected destroyEvent$ = new Subject<void>();
  showNotes = false;
  
  constructor(private cdr: ChangeDetectorRef) {
  }
  
  showNoteInput(): void {
    this.showNotes = true;
    this.cdr.markForCheck();
  }
  
  onNoteBlur(): void {
    if (!this.notes.control.value?.trim()) {
      this.showNotes = false;
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    if (this.data.notes) {
      this.notes.control.patchValue(this.data.notes);
      this.showNotes = true;
    }
    
    // Only wire the sync pipeline when a sync subject is actually provided (i.e. editing mode).
    // In read-only rendering noteSync$ is undefined, so nothing below runs — no accidental writes.
    if (!this.noteSync$) { return; }

    this.notes.control.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      takeUntil(this.destroyEvent$)
    ).subscribe(value => {
      this.data.notes = value || undefined;
      this.noteSync$?.next(this.data);
    });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}