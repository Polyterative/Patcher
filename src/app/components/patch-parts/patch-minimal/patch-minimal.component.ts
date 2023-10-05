import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
}                                 from '@angular/core';
import { Subject }                from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { UserManagementService }  from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService }      from 'src/app/features/backend/url-creator.service';
import { PatchMinimal }           from '../../../models/patch';

@Component({
  selector:        'app-patch-minimal',
  templateUrl:     './patch-minimal.component.html',
  styleUrls:       ['./patch-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
}                                 from '@angular/core';
import { Subject }                from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { UserManagementService }  from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService }      from 'src/app/features/backend/url-creator.service';
import { PatchMinimal }           from '../../../models/patch';

@Component({
  selector:        'app-patch-minimal',
  templateUrl:     './patch-minimal.component.html',
  styleUrls:       ['./patch-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchMinimalComponent implements OnInit, OnDestroy {
  @Input() data: PatchMinimal;
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  protected destroyEvent$ = new Subject<void>();
  
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

  generatePatchText(): string {
    let patchText = `Patch name "${this.data.name}"\n`;
    this.data.connections.forEach(connection => {
      patchText += `${connection.source} => ${connection.target}\n`;
    });
    return patchText;
  }
  import { TestBed } from '@angular/core/testing';
  import { PatchMinimalComponent } from './patch-minimal.component';
  
  describe('PatchMinimalComponent', () => {
  let component: PatchMinimalComponent;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      // provide the component's constructor with the necessary dependencies
    });
    component = TestBed.inject(PatchMinimalComponent);
    component.data = {
      name: 'Test Patch',
      connections: [
        { source: 'Source 1', target: 'Target 1' },
        { source: 'Source 2', target: 'Target 2' },
      ],
    };
  });
  
  it('should generate patch text correctly', () => {
    const expectedPatchText = `Patch name "Test Patch"\nSource 1 => Target 1\nSource 2 => Target 2\n`;
    expect(component.generatePatchText()).toEqual(expectedPatchText);
  });
  });
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
