import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';


@Component({
  selector: 'app-manufacturer-row',
  templateUrl: './manufacturer-row.component.html',
  styleUrls: ['./manufacturer-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerRowComponent implements OnInit, OnDestroy {
  @Input() manufacturer!: ManufacturerDetail;

  readonly modules$ = new BehaviorSubject<ModuleList>(null);
  private readonly destroy$ = new Subject<void>();
  
  constructor(private backend: SupabaseService) {
  }

  ngOnInit(): void {
    this.backend.get.modulesBySameManufacturer(this.manufacturer.id, 0, 29)
      .pipe(takeUntil(this.destroy$))
      .subscribe(modules => this.modules$.next(modules ?? []));
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}