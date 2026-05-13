import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { SubManager } from '../../../directives/subscription-manager';


export interface ContextMenuItem {
  id: string;
  icon?: string;
  label: string;
  disabled: boolean;
  danger?: boolean;
  data?: unknown;
  click$: Subject<ContextMenuItem>;
  submenu?: ContextMenuItem[];
  imageUrl?: string;
}

@Injectable()
export class GeneralContextMenuDataService extends SubManager {
  
  readonly menuItems$: BehaviorSubject<ContextMenuItem[]> = new BehaviorSubject<ContextMenuItem[]>([]);
  
  readonly positionData$ = new BehaviorSubject<{
    x: string,
    y: string
  }>({
    x: '0px',
    y: '0px'
  });
  
  readonly open$ = new Subject<MouseEvent>();

  clampPosition(event: MouseEvent, itemCount = this.menuItems$.value.length): {x: string; y: string} {
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const viewportWidth = visualViewport?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
    const viewportHeight = visualViewport?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 0);
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const menuWidth = 18;
    const estimatedMenuWidthPx = menuWidth * 16;
    const estimatedMenuHeightPx = Math.min(Math.max(itemCount, 1), 8) * 48;
    const marginPx = 12;

    const clampedX = Math.max(
      viewportLeft + marginPx,
      Math.min(event.clientX, viewportLeft + viewportWidth - estimatedMenuWidthPx - marginPx)
    );
    const clampedY = Math.max(
      viewportTop + marginPx,
      Math.min(event.clientY, viewportTop + viewportHeight - estimatedMenuHeightPx - marginPx)
    );

    return {
      x: `${ clampedX }px`,
      y: `${ clampedY }px`
    };
  }
   
}
