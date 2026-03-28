import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import {
  FLAG_CATEGORIES,
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

  readonly flagCategories = FLAG_CATEGORIES;
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
      category: this.selectedCategory as any,
      note:     this.flagNote
    });
    this.resetForm();
  }

  cancelFlag(): void {
    this.resetForm();
    this.flagService.toggleForm$.next();
  }

  private resetForm(): void {
    this.selectedCategory = '';
    this.flagNote = '';
  }
}
