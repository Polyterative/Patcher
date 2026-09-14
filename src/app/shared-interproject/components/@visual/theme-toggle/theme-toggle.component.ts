import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  combineLatest,
  map,
  Observable
} from 'rxjs';
import {
  AppThemeEffective,
  AppThemePreference,
  AppThemeService
} from 'src/app/shared-interproject/app-theme.service';

interface ThemeToggleVm {
  readonly preference: AppThemePreference;
  readonly effective: AppThemeEffective;
  readonly icon: string;
  readonly label: string;
  readonly tooltip: string;
}

function toVm(preference: AppThemePreference, dark: boolean): ThemeToggleVm {
  const effective: AppThemeEffective = dark ? 'dark' : 'light';
  const icon = preference === 'system' ? 'brightness_auto' : dark ? 'dark_mode' : 'light_mode';
  const preferenceLabel = preference === 'system' ? `System (${ effective })` : preference === 'dark' ? 'Dark' : 'Light';
  const next = preference === 'system' ? 'dark' : preference === 'dark' ? 'light' : 'system';
  return {
    preference,
    effective,
    icon,
    label: `Appearance: ${ preferenceLabel }. Activate to switch to ${ next }.`,
    tooltip: `Appearance: ${ preferenceLabel }`
  };
}

/**
 * Discrete system-first appearance toggle.
 *
 * Single icon-button, low visual weight by default, full opacity on
 * hover/focus. Cycles system → dark → light → system. The OS theme wins
 * until the user picks an explicit override.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent {
  readonly vm$: Observable<ThemeToggleVm>;

  constructor(private readonly theme: AppThemeService) {
    this.vm$ = combineLatest([this.theme.preference$, this.theme.effectiveDark$]).pipe(
      map(([preference, dark]) => toVm(preference, dark))
    );
  }

  cycle(): void {
    this.theme.cyclePreference();
  }
}
