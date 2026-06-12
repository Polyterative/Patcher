import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { GraphViewService } from 'src/app/shared-interproject/components/@visual/graph-view/graph-view.service';


export interface PatchGraphLegendItem {
  label: string;
  color: string;
}

export interface PatchGraphFullscreenDialogData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  legend: PatchGraphLegendItem[];
}

@Component({
  selector: 'app-patch-graph-fullscreen-dialog',
  templateUrl: './patch-graph-fullscreen-dialog.component.html',
  styleUrls: ['./patch-graph-fullscreen-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GraphViewService],
  standalone: false
})
export class PatchGraphFullscreenDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fullscreenTarget', {static: true}) fullscreenTarget!: ElementRef<HTMLElement>;

  /** Graph is only mounted after the dialog has settled, so the open animation
   *  isn't stalled by Sigma boot. */
  graphReady = false;

  private ownsBrowserFullscreen = false;
  private readonly handleFullscreenChange = () => {
    if (this.ownsBrowserFullscreen && !document.fullscreenElement) {
      this.ownsBrowserFullscreen = false;
      this.dialogRef.close();
    }
  };

  constructor(
    public dialogRef: MatDialogRef<PatchGraphFullscreenDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PatchGraphFullscreenDialogData,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {
    this.dialogRef.beforeClosed().subscribe(() => this.exitBrowserFullscreen());
  }

  ngAfterViewInit(): void {
    const target = this.fullscreenTarget?.nativeElement ?? document.documentElement;
    const canRequestFullscreen =
      typeof document !== 'undefined' &&
      document.fullscreenEnabled &&
      !document.fullscreenElement;

    if (!canRequestFullscreen) {
      this.mountGraphAfterPaint();
      return;
    }

    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    target.requestFullscreen()
      .then(() => {
        this.ownsBrowserFullscreen = true;
      })
      .catch(error => {
        console.warn('Unable to enter browser fullscreen for graph view.', error);
      })
      .finally(() => this.mountGraphAfterPaint());
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    this.exitBrowserFullscreen();
  }

  close(): void {
    this.dialogRef.close();
  }

  private mountGraphAfterPaint(): void {
    if (this.graphReady) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      // Let the dialog + placeholder paint and the fullscreen layout settle
      // before paying the Sigma boot cost. 180ms is below the design-language
      // 200ms perception threshold for "instant" but long enough for the
      // pulse to register.
      setTimeout(() => {
        this.zone.run(() => {
          this.graphReady = true;
          this.cdr.markForCheck();
        });
      }, 180);
    });
  }

  private exitBrowserFullscreen(): void {
    if (!this.ownsBrowserFullscreen) {
      return;
    }
    this.ownsBrowserFullscreen = false;
    if (typeof document === 'undefined' || !document.fullscreenElement) {
      return;
    }
    document.exitFullscreen()
      .catch(error => {
        console.warn('Unable to exit browser fullscreen for graph view.', error);
      });
  }
}
