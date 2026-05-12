import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
  linkedRackHelpOpen = false;
  readonly linkedRackHelpSections = [
    {
      icon: 'bolt',
      title: 'Why it helps',
      body: 'Use a linked rack when seeing the patch inside its real rack helps you patch faster and with less guesswork.'
    },
    {
      icon: 'view_quilt',
      title: 'Best moment to use it',
      body: 'It is especially handy when that rack is already in front of you, because the layout on screen matches what you are looking at physically.'
    },
    {
      icon: 'sync_alt',
      title: 'How it behaves',
      body: 'The rack is optional context only. The patch still works on its own, and if the rack changes later the linked-rack view updates while the patch stays intact.'
    }
  ] as const;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: PatchDetailDataService,
    public urlCreatorService: UrlCreatorService,
    private readonly elementRef: ElementRef<HTMLElement>
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

  openLinkedRackHelp(): void {
    this.linkedRackHelpOpen = true;
  }

  closeLinkedRackHelp(): void {
    this.linkedRackHelpOpen = false;
  }

  onLinkedRackHelpFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as Node | null;
    const helpRoot = this.elementRef.nativeElement.querySelector('.patch-linked-rack__help');

    if (nextTarget && helpRoot?.contains(nextTarget)) {
      return;
    }

    this.closeLinkedRackHelp();
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
