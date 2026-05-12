import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  COMMA,
  ENTER
} from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { Subject } from 'rxjs';
import {
  LinkedRackUiState,
  PatchDetailDataService
} from 'src/app/components/patch-parts/patch-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { PatchMinimal } from 'src/app/models/patch';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';


@Component({
  selector: 'app-patch-minimal',
  templateUrl: './patch-minimal.component.html',
  styleUrls: ['./patch-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchMinimalComponent implements OnInit, OnDestroy {
  @Input() data: PatchMinimal;
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  protected destroyEvent$ = new Subject<void>();
  readonly tagSeparatorKeysCodes: number[] = [ENTER, COMMA];
  readonly formTypes = FormTypes;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: PatchDetailDataService,
    public urlCreatorService: UrlCreatorService
  ) {}
  
  ngOnInit(): void {
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.dataService.addPatchTag(value);
    }
    event.chipInput?.clear();
  }

  removeTag(tag: string): void {
    this.dataService.removePatchTag(tag);
  }

  clearLinkedRack(): void {
    this.dataService.clearLinkedRack();
  }

  getLinkedRackStatusClass(state: LinkedRackUiState | null | undefined): string {
    switch (state?.statusTone) {
      case 'positive':
        return 'patch-linked-rack__status--positive';
      case 'warning':
        return 'patch-linked-rack__status--warning';
      default:
        return 'patch-linked-rack__status--neutral';
    }
  }

  getLinkedRackAvailabilityLabel(optionCount: number | null | undefined): string {
    const count = optionCount ?? 0;
    if (count === 0) {
      return 'No saved racks yet';
    }
    if (count === 1) {
      return '1 rack available';
    }
    return `${ count } racks available`;
  }
  
}

export interface PatchMinimalViewConfig {
  hideLabels: boolean;
  hideManufacturer: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
}

export const defaultPatchMinimalViewConfig: PatchMinimalViewConfig = {
  hideLabels:       false,
  hideManufacturer: false,
  hideDescription:  false,
  hideButtons:      true,
  hideHP:           false,
  hideDates:        false
};
