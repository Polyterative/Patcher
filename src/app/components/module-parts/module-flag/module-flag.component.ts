import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import {
  FLAG_CATEGORY_GROUPS,
  FlagCategoryGroup,
  ModuleFlagDataService
} from './module-flag-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';


@Component({
  selector:        'app-module-flag',
  templateUrl:     './module-flag.component.html',
  styleUrls:       ['./module-flag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false,
  providers:       [ModuleFlagDataService]
})
export class ModuleFlagComponent implements OnChanges {
  @Input() moduleId: number;

  readonly flagCategoryGroups = FLAG_CATEGORY_GROUPS;
  selectedGroupLabel: string = '';
  selectedCategory: string = '';
  flagNote: string = '';

  constructor(
    public flagService: ModuleFlagDataService,
    public userService: UserManagementService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['moduleId'] && this.moduleId) {
      this.flagService.moduleId$.next(this.moduleId);
    }
  }

  submitFlag(): void {
    if (!this.selectedCategory) return;
    this.flagService.submitFlag$.next({
      category: this.selectedCategory,
      note:     this.flagNote
    });
    this.resetForm();
  }

  cancelFlag(): void {
    this.resetForm();
    this.flagService.toggleForm$.next();
  }

  selectGroup(groupLabel: string): void {
    this.selectedGroupLabel = groupLabel;
    this.selectedCategory = '';
  }

  selectCategory(categoryValue: string): void {
    this.selectedCategory = categoryValue;
  }

  get selectedGroupOptions(): FlagCategoryGroup['options'] {
    return this.flagCategoryGroups.find(group => group.label === this.selectedGroupLabel)?.options ?? [];
  }

  get selectedGroup(): FlagCategoryGroup | undefined {
    return this.flagCategoryGroups.find(group => group.label === this.selectedGroupLabel);
  }

  get selectedCategoryLabel(): string {
    return this.selectedGroupOptions.find(option => option.value === this.selectedCategory)?.label ?? '';
  }

  private resetForm(): void {
    this.selectedGroupLabel = '';
    this.selectedCategory = '';
    this.flagNote = '';
  }
}
