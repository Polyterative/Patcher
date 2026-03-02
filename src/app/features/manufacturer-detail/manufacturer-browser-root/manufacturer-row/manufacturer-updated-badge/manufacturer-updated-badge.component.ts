import {
  Component,
  Input
} from '@angular/core';


const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COLOR = 'rgba(36, 49, 63, 0.84)';
const STALE_COLOR = '#111111';

@Component({
  selector: 'app-manufacturer-updated-badge',
  templateUrl: './manufacturer-updated-badge.component.html',
  styleUrls: ['./manufacturer-updated-badge.component.scss'],
  standalone: false
})
export class ManufacturerUpdatedBadgeComponent {
  private _updatedAt: string | null = null;
  updatedColor = DEFAULT_COLOR;
  
  @Input()
  set updatedAt(value: string | null | undefined) {
    this._updatedAt = value ?? null;
    this.updatedColor = this.resolveUpdatedColor(this._updatedAt);
  }
  
  get updatedAt(): string | null {
    return this._updatedAt;
  }
  
  resolveUpdatedColor(updatedAt: string | null, nowMs: number = Date.now()): string {
    if (!updatedAt) {
      return DEFAULT_COLOR;
    }
    
    const parsedMs = Date.parse(updatedAt);
    if (Number.isNaN(parsedMs)) {
      return DEFAULT_COLOR;
    }
    
    const ageMs = Math.max(0, nowMs - parsedMs);
    if (ageMs >= WEEK_IN_MS) {
      return STALE_COLOR;
    }
    
    const ageDays = ageMs / DAY_IN_MS;
    const hotness = 1 - (ageDays / 7); // 1 = very recent (hot), 0 = near stale.
    
    // Keep "hot metal" feel while preserving contrast on light backgrounds.
    const hue = Math.round(34 + (hotness * 8)); // bronze -> amber
    const saturation = Math.round(72 + (hotness * 20)); // vivid but not neon
    const lightness = Math.round(12 + (hotness * 16)); // dark enough for light UIs
    
    return `hsl(${ hue }deg ${ saturation }% ${ lightness }%)`;
  }
}