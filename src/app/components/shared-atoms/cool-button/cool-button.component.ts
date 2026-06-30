import { CommonModule } from '@angular/common';
import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type ReactionEntityType } from 'src/app/features/backend/supabase-reactions';
import {
  CoolButtonDataService,
  type CoolCountDisplayMode,
  type CoolToggleResult
} from './cool-button-data.service';

@Component({
  selector: 'app-cool-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  providers: [CoolButtonDataService],
  templateUrl: './cool-button.component.html',
  styleUrls: ['./cool-button.component.scss'],
  animations: [
    trigger('coolCountResize', [
      transition(':enter', [
        style({
          maxInlineSize: '0',
          minInlineSize: '0',
          opacity: 0,
          paddingInline: '0',
          transform: 'scale(0.72)'
        }),
        animate('520ms cubic-bezier(0.22, 1, 0.36, 1)', style({
          maxInlineSize: '4rem',
          minInlineSize: '*',
          opacity: 1,
          paddingInline: '*',
          transform: 'scale(1)'
        }))
      ]),
      transition(':leave', [
        style({
          maxInlineSize: '4rem',
          overflow: 'hidden'
        }),
        animate('360ms cubic-bezier(0.4, 0, 0.2, 1)', style({
          maxInlineSize: '0',
          minInlineSize: '0',
          opacity: 0,
          paddingInline: '0',
          transform: 'scale(0.72)'
        }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoolButtonComponent implements OnChanges, OnDestroy {
  @Input() entityType: ReactionEntityType | null | undefined = null;
  @Input() entityId: number | null | undefined = null;
  @Input() eligible: boolean | null | undefined = false;
  @Input() countDisplayMode: CoolCountDisplayMode | null | undefined = 'count';
  @Input() variant: 'default' | 'overlay' | 'title' = 'default';
  @Output() coolToggled = new EventEmitter<CoolToggleResult>();

  bursting = false;
  releasing = false;
  private burstResetId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly dataService: CoolButtonDataService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    this.dataService.setEntity({
      entityType: this.entityType ?? null,
      entityId: this.entityId ?? null,
      eligible: this.eligible === true,
      countDisplayMode: this.countDisplayMode ?? 'count'
    });
  }

  ngOnDestroy(): void {
    if (this.burstResetId != null) {
      clearTimeout(this.burstResetId);
    }
  }

  requestToggle(): void {
    const vm = this.dataService.vm$.value;
    if (!vm.visible || vm.disabled || vm.loading) {
      return;
    }

    const shouldBurst = !vm.active;
    this.dataService.requestToggle$.next({
      onSuccess: result => this.coolToggled.emit(result)
    });
    if (this.bursting || this.releasing) {
      this.bursting = false;
      this.releasing = false;
      this.cdr.detectChanges();
    }
    this.bursting = shouldBurst;
    this.releasing = !shouldBurst;
    this.cdr.markForCheck();
    if (this.burstResetId != null) {
      clearTimeout(this.burstResetId);
    }
    this.burstResetId = setTimeout(() => {
      this.bursting = false;
      this.releasing = false;
      this.burstResetId = null;
      this.cdr.markForCheck();
    }, 1050);
  }
}
