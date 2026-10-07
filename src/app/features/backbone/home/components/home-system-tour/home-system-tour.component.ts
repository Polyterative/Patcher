import { AsyncPipe } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { HomeCtaClick, HomeTourTab } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-system-tour',
  templateUrl: './home-system-tour.component.html',
  styleUrls: ['./home-system-tour.component.scss'],
  standalone: true,
  imports: [AsyncPipe, MatIconModule, RouterLink]
})
export class HomeSystemTourComponent {
  @Input({required: true}) tabs: HomeTourTab[] = [];
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();

  @ViewChildren('tabButton') private readonly tabButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  private readonly _activeIndex$ = new BehaviorSubject<number>(0);
  readonly activeIndex$ = this._activeIndex$.asObservable();

  select(index: number): void {
    this._activeIndex$.next(index);
  }

  /** WAI-ARIA tabs pattern: arrows move and select, Home/End jump to the ends. */
  onTabKeydown(event: KeyboardEvent, index: number): void {
    const last = this.tabs.length - 1;
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
    this.select(next);
    this.tabButtons?.get(next)?.nativeElement.focus();
  }
}
