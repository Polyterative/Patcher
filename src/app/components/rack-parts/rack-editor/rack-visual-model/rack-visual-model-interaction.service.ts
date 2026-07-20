import { CdkDragDrop, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { ElementRef, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { RackedModule } from 'src/app/models/module';
import { prefersTouchInteraction } from 'src/app/shared-interproject/touch-interaction.utils';
import { ModuleRightClick } from '../rack-editor.types';

interface RackOrderChangePublisher {
  rackOrderChange$: {
    next(value: {event: CdkDragDrop<ElementRef>; newRow: number; module: RackedModule}): void;
  };
}

@Injectable()
export class RackVisualModelInteractionService {
  private static readonly dropRevealAnimationDurationMs = 225;
  private static readonly touchContextMenuDelayMs = 550;
  private static readonly touchLongPressMoveTolerancePx = 12;

  touchInteractionMode = prefersTouchInteraction();

  private dragImageAnimationSuppressedModule: RackedModule | null = null;
  private dropRevealSuppressedModule: RackedModule | null = null;
  private dropRevealAnimatingModule: RackedModule | null = null;
  private touchLongPressTimerId: number | null = null;
  private touchLongPressModule: RackedModule | null = null;
  private touchLongPressStartPoint: {x: number; y: number} | null = null;
  private touchContextMenuBlockedModule: RackedModule | null = null;

  isModuleDragDisabled(
    rackedModule: RackedModule,
    isCurrentRackEditable: boolean,
    isCurrentRackPropertyOfCurrentUser: boolean
  ): boolean {
    return !(isCurrentRackEditable && isCurrentRackPropertyOfCurrentUser)
      || this.touchContextMenuBlockedModule === rackedModule;
  }

  onModulePointerDown(
    event: PointerEvent,
    rackedModule: RackedModule,
    isCurrentRackEditable: boolean,
    isCurrentRackPropertyOfCurrentUser: boolean,
    moduleRightClick$: Subject<ModuleRightClick>,
    markForCheck: () => void
  ): void {
    if (!this.shouldTrackTouchLongPress(event, isCurrentRackEditable, isCurrentRackPropertyOfCurrentUser)) {
      return;
    }

    this.clearTouchInteractionState();
    this.touchLongPressModule = rackedModule;
    this.touchLongPressStartPoint = {
      x: event.clientX,
      y: event.clientY
    };
    this.touchLongPressTimerId = window.setTimeout(() => {
      if (this.touchLongPressModule !== rackedModule || !this.touchLongPressStartPoint) {
        return;
      }

      this.touchLongPressTimerId = null;
      this.touchContextMenuBlockedModule = rackedModule;
      this.emitTouchContextMenu(
        rackedModule,
        this.touchLongPressStartPoint.x,
        this.touchLongPressStartPoint.y,
        moduleRightClick$
      );
      markForCheck();
    }, RackVisualModelInteractionService.touchContextMenuDelayMs);
  }

  onModulePointerMove(event: PointerEvent, rackedModule: RackedModule): void {
    if (
      !this.touchInteractionMode
      || event.pointerType !== 'touch'
      || this.touchLongPressModule !== rackedModule
      || !this.touchLongPressStartPoint
    ) {
      return;
    }

    const distanceX = event.clientX - this.touchLongPressStartPoint.x;
    const distanceY = event.clientY - this.touchLongPressStartPoint.y;
    const distanceSquared = (distanceX ** 2) + (distanceY ** 2);

    if (distanceSquared > RackVisualModelInteractionService.touchLongPressMoveTolerancePx ** 2) {
      this.cancelPendingTouchLongPress(rackedModule);
    }
  }

  onModulePointerUp(
    eventOrModule: PointerEvent | RackedModule,
    maybeRackedModule: RackedModule | undefined,
    touchPrimaryActionsEnabled: boolean,
    emitSelection: (rackedModule: RackedModule) => void
  ): void {
    const rackedModule = maybeRackedModule ?? eventOrModule as RackedModule;
    const event = maybeRackedModule ? eventOrModule as PointerEvent : null;
    const shouldEmitSelection = touchPrimaryActionsEnabled
      && this.touchInteractionMode
      && event?.pointerType === 'touch'
      && this.touchLongPressModule === rackedModule
      && this.touchLongPressStartPoint !== null
      && this.touchContextMenuBlockedModule !== rackedModule;
    this.clearTouchInteractionState(rackedModule);
    if (shouldEmitSelection) {
      emitSelection(rackedModule);
    }
  }

  onModulePointerCancel(rackedModule: RackedModule): void {
    this.clearTouchInteractionState(rackedModule);
  }

  onDropListDropped(
    event: CdkDragDrop<ElementRef>,
    rowId: number,
    module: RackedModule,
    rackDetailDataService: RackOrderChangePublisher,
    suppressLayoutMoveAnimationForManualDrop: () => void,
    setSuppressPostDropReorder: (value: boolean) => void,
    markForCheck: () => void
  ): void {
    const shouldAnimateDropReveal = event.previousContainer === event.container;
    suppressLayoutMoveAnimationForManualDrop();
    setSuppressPostDropReorder(true);
    markForCheck();
    rackDetailDataService.rackOrderChange$.next({event, newRow: rowId, module});
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.dropRevealSuppressedModule === module) {
          this.dropRevealSuppressedModule = null;
        }
        if (shouldAnimateDropReveal) {
          this.dropRevealAnimatingModule = module;
        }
        if (this.dragImageAnimationSuppressedModule === module) {
          this.dragImageAnimationSuppressedModule = null;
        }
        setSuppressPostDropReorder(false);
        markForCheck();
        if (shouldAnimateDropReveal) {
          window.setTimeout(() => {
            if (this.dropRevealAnimatingModule === module) {
              this.dropRevealAnimatingModule = null;
              markForCheck();
            }
          }, RackVisualModelInteractionService.dropRevealAnimationDurationMs);
        }
      });
    });
  }

  onDragStarted(_event: CdkDragStart<RackedModule>, module: RackedModule, markForCheck: () => void): void {
    this.cancelPendingTouchLongPress(module);
    this.touchContextMenuBlockedModule = null;
    this.dragImageAnimationSuppressedModule = module;
    if (this.dropRevealAnimatingModule === module) {
      this.dropRevealAnimatingModule = null;
    }
    markForCheck();
  }

  onDragReleased(_event: unknown, module: RackedModule, markForCheck: () => void): void {
    this.clearTouchInteractionState(module);
    this.dropRevealSuppressedModule = module;
    markForCheck();
  }

  onDragEnded(
    _event: CdkDragEnd<RackedModule>,
    module: RackedModule,
    isSuppressPostDropReorder: () => boolean,
    markForCheck: () => void
  ): void {
    this.clearTouchInteractionState(module);
    const shouldClearDragImageSuppression = this.dragImageAnimationSuppressedModule === module;
    const shouldClearDropRevealSuppression = this.dropRevealSuppressedModule === module;

    if (!shouldClearDragImageSuppression && !shouldClearDropRevealSuppression) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          shouldClearDropRevealSuppression
          && this.dropRevealSuppressedModule === module
          && !isSuppressPostDropReorder()
        ) {
          this.dropRevealSuppressedModule = null;
        }

        if (
          shouldClearDragImageSuppression
          && this.dragImageAnimationSuppressedModule === module
          && !isSuppressPostDropReorder()
          && this.dropRevealSuppressedModule !== module
        ) {
          this.dragImageAnimationSuppressedModule = null;
        }

        markForCheck();
      });
    });
  }

  isDragImageAnimationSuppressed(module: RackedModule): boolean {
    return this.dragImageAnimationSuppressedModule === module;
  }

  isDropRevealSuppressed(module: RackedModule): boolean {
    return this.dropRevealSuppressedModule === module;
  }

  isDropRevealAnimating(module: RackedModule): boolean {
    return this.dropRevealAnimatingModule === module;
  }

  clearTouchInteractionState(rackedModule?: RackedModule): void {
    this.cancelPendingTouchLongPress(rackedModule);

    if (!rackedModule || this.touchContextMenuBlockedModule === rackedModule) {
      this.touchContextMenuBlockedModule = null;
    }
  }

  private shouldTrackTouchLongPress(
    event: PointerEvent,
    isCurrentRackEditable: boolean,
    isCurrentRackPropertyOfCurrentUser: boolean
  ): boolean {
    return this.touchInteractionMode
      && event.pointerType === 'touch'
      && isCurrentRackEditable
      && isCurrentRackPropertyOfCurrentUser;
  }

  private emitTouchContextMenu(
    rackedModule: RackedModule,
    clientX: number,
    clientY: number,
    moduleRightClick$: Subject<ModuleRightClick>
  ): void {
    moduleRightClick$.next({
      $event: new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY
      }),
      rackedModule
    });
  }

  private cancelPendingTouchLongPress(rackedModule?: RackedModule): void {
    if (rackedModule && this.touchLongPressModule !== rackedModule) {
      return;
    }

    if (this.touchLongPressTimerId != null) {
      clearTimeout(this.touchLongPressTimerId);
      this.touchLongPressTimerId = null;
    }

    if (!rackedModule || this.touchLongPressModule === rackedModule) {
      this.touchLongPressModule = null;
      this.touchLongPressStartPoint = null;
    }
  }
}
