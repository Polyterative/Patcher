import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject } from 'rxjs';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import {
  SegmentedControlComponent,
  SegmentedControlOption
} from 'src/app/shared-interproject/components/@visual/segmented-control/segmented-control.component';
import { HomeCtaClick, HomeTourTab } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-system-tour',
  templateUrl: './home-system-tour.component.html',
  styleUrls: ['./home-system-tour.component.scss'],
  standalone: true,
  imports: [AsyncPipe, BrandPrimaryButtonComponent, MatIconModule, SegmentedControlComponent]
})
export class HomeSystemTourComponent {
  @Input({required: true})
  set tabs(tabs: HomeTourTab[]) {
    this._tabs = tabs;
    this.tabOptions = tabs.map(({id, label, icon}) => ({id, label, icon}));
  }

  get tabs(): HomeTourTab[] {
    return this._tabs;
  }

  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();

  tabOptions: SegmentedControlOption[] = [];

  private _tabs: HomeTourTab[] = [];
  private readonly _activeId$ = new BehaviorSubject<string | undefined>(undefined);
  readonly activeId$ = this._activeId$.asObservable();

  select(id: string): void {
    this._activeId$.next(id);
  }
}
