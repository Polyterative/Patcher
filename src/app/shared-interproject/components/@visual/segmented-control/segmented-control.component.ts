import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface SegmentedControlOption {
  id: string;
  label: string;
  /** Material icon name. */
  icon?: string;
}

/**
 * `toggle`: a button group where one segment is pressed (`aria-pressed`), like the module list view switch.
 * `tabs`: a WAI-ARIA tablist; the owner renders the matching `tabpanel`s (see `tabId` / `panelId`).
 */
export type SegmentedControlKind = 'toggle' | 'tabs';

export type SegmentedControlSize = 'default' | 'large';

/**
 *  UI ONLY COMPONENT
 *
 *  Pill-shaped single-select control that reads its colours from the Material button-toggle tokens,
 *  so it matches `mat-button-toggle-group` in both themes. Use it where `mat-button-toggle-group`
 *  cannot express the semantics (tablist) or the options are plain data.
 */
@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.component.html',
  styleUrls: ['./segmented-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule]
})
export class SegmentedControlComponent {
  @Input({required: true}) options: readonly SegmentedControlOption[] = [];
  @Input() value: string | undefined = undefined;
  @Input() kind: SegmentedControlKind = 'toggle';
  @Input() size: SegmentedControlSize = 'default';
  @Input() ariaLabel = '';
  /** Prefix for tab / panel element ids (`<prefix>-tab-<id>`, `<prefix>-panel-<id>`). */
  @Input() idPrefix = 'segmented';
  @Output() readonly valueChange = new EventEmitter<string>();

  @ViewChildren('segment') private readonly segments?: QueryList<ElementRef<HTMLButtonElement>>;

  tabId(option: SegmentedControlOption): string {
    return `${this.idPrefix}-tab-${option.id}`;
  }

  panelId(option: SegmentedControlOption): string {
    return `${this.idPrefix}-panel-${option.id}`;
  }

  /** Without a value the first segment counts as selected, so a tablist always has one tab stop. */
  isSelected(option: SegmentedControlOption): boolean {
    return (this.value ?? this.options[0]?.id) === option.id;
  }

  select(option: SegmentedControlOption): void {
    if (option.id !== this.value) {
      this.valueChange.emit(option.id);
    }
  }

  /** WAI-ARIA tabs pattern: arrows move and select, Home/End jump to the ends. */
  onKeydown(event: KeyboardEvent, index: number): void {
    if (this.kind !== 'tabs') {
      return;
    }
    const last = this.options.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last
    }[event.key];

    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this.select(this.options[next]);
    this.segments?.get(next)?.nativeElement.focus();
  }
}
