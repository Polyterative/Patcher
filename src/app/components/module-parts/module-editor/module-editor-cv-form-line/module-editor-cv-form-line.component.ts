import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { FormCV } from '../module-editor-data.service';


@Component({
  selector: 'app-module-editor-cv-form-line',
  templateUrl: './module-editor-cv-form-line.component.html',
  styleUrls: ['./module-editor-cv-form-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleEditorCvFormLineComponent implements OnInit {
  
  @Input() item: FormCV;
  
  @Output() removeRequest$ = new EventEmitter<void>();
  
  types = FormTypes;

  get isRemovable(): boolean {
    return this.item?.id === 0;
  }

  get statusLabel(): string {
    if (this.isRemovable) {
      return 'Draft';
    }

    return this.item?.isApproved ? 'Approved' : 'Saved';
  }

  get statusCompactLabel(): string {
    if (this.isRemovable) {
      return 'Draft';
    }
    
    return this.item?.isApproved ? 'Approved' : 'Saved';
  }
  
  get actionIcon(): string {
    if (this.isRemovable) {
      return 'delete_outline';
    }

    return this.item?.isApproved ? 'check_circle' : 'lock';
  }

  get actionTooltip(): string {
    if (this.isRemovable) {
      return 'Remove unsaved CV row';
    }

    return this.item?.isApproved
      ? 'Approved rows are locked and cannot be removed here'
      : 'Saved rows are locked and cannot be removed here';
  }

  get actionAriaLabel(): string {
    return this.isRemovable ? 'Remove unsaved CV row' : 'CV row is locked';
  }
  
  ngOnInit(): void {
    // perform checks on this.item and console errors if needed
    if (!this.item) {
      console.error('ModuleEditorCvFormLineComponent: item is undefined');
    }
  
  }

  requestRemove(): void {
    if (!this.isRemovable) {
      return;
    }

    this.removeRequest$.next();
  }
  
}
