import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbModule } from 'src/app/models/module';
import { defaultModuleMinimalViewConfig, ModuleMinimalViewConfig } from '../module-minimal/module-minimal.component';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector:        'app-module-details',
  templateUrl:     './module-details.component.html',
  styleUrls:       ['./module-details.component.scss'],
  animations:      [
    fadeInOnEnterAnimation({
      duration: 8000,
      delay:    0,
      anchor:   'help'
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleDetailsComponent implements OnInit {
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  
  switches = [];
  
  constructor(
    public backend: SupabaseService,
    private clipboard: Clipboard
    // userManagerService: UserManagementService
  ) {
    // console.error(patchService);
  }
  
  ngOnInit(): void {
  }

  copyModuleNameAndManufacturer(): void {
    const textToCopy = `${this.data.name} by ${this.data.manufacturer.name}`;
    this.clipboard.copy(textToCopy);
  }
  
}
