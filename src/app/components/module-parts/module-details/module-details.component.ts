import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbModule } from 'src/app/models/module';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../module-minimal/module-minimal.component';
import {
  FLAG_CATEGORIES,
  ModuleFlagDataService
} from '../module-flag/module-flag-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';


@Component({
  selector: 'app-module-details',
  templateUrl: './module-details.component.html',
  styleUrls: ['./module-details.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      duration: 8000,
      delay: 0,
      anchor: 'help'
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  providers: [ModuleFlagDataService]
})
export class ModuleDetailsComponent implements OnInit, OnChanges {
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  /** Passed through to app-module-cvs for instance-aware CV clicks */
  @Input() instanceId: number | undefined;

  readonly flagCategories = FLAG_CATEGORIES;
  selectedCategory: string = '';
  flagNote: string = '';

  switches = [];

  constructor(
    public backend: SupabaseService,
    public flagService: ModuleFlagDataService,
    public userService: UserManagementService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.flagService.moduleId$.next(this.data.id);
    }
  }

  submitFlag(): void {
    if (!this.selectedCategory) return;
    this.flagService.submitFlag$.next({
      category: this.selectedCategory as any,
      note: this.flagNote
    });
    this.selectedCategory = '';
    this.flagNote = '';
  }
}
