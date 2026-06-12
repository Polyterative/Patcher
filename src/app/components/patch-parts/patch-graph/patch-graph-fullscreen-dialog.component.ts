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
import { domToPng } from 'modern-screenshot';
import {
  GraphComponent,
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
  patchName?: string;
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
  /** Multiplier applied to node and edge sizes so points are easier to read on a large canvas. */
  private static readonly FULLSCREEN_SIZE_BOOST = 1.25;

  @ViewChild('fullscreenTarget', {static: true}) fullscreenTarget!: ElementRef<HTMLElement>;
  @ViewChild(GraphComponent) graphComponent?: GraphComponent;

  /** Graph is only mounted after the dialog has settled, so the open animation
   *  isn't stalled by Sigma boot. */
  graphReady = false;

  downloading = false;

  readonly scaledNodes: GraphNode[];
  readonly scaledEdges: GraphEdge[];

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
    const boost = PatchGraphFullscreenDialogComponent.FULLSCREEN_SIZE_BOOST;
    this.scaledNodes = data.nodes.map(node => ({...node, size: node.size * boost}));
    this.scaledEdges = data.edges.map(edge => ({...edge, size: edge.size * boost}));
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

  downloadImage(): void {
    if (this.downloading) {
      return;
    }
    const renderer = this.graphComponent?.renderer;
    const target = this.fullscreenTarget?.nativeElement;
    if (!renderer || !target) {
      return;
    }

    this.downloading = true;
    this.cdr.markForCheck();
    target.classList.add('patch-graph-fullscreen-dialog--capturing');

    const cleanup = () => {
      target.classList.remove('patch-graph-fullscreen-dialog--capturing');
      this.downloading = false;
      this.cdr.markForCheck();
    };

    // Sigma's WebGL contexts (esp. the nodes layer) don't preserve their drawing
    // buffer, so we have to flatten each canvas into a 2D snapshot in the same
    // microtask as the WebGL draw. We hook afterRender once, snapshot the
    // canvases there, swap them into the DOM, then let modern-screenshot walk
    // the (now fully readable) DOM. Originals are restored on completion.
    const sourceCanvases = Array.from(target.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const swaps: { original: HTMLCanvasElement; snapshot: HTMLCanvasElement }[] = [];

    const finishCapture = () => {
      // Swap snapshots back to originals so the live graph keeps working.
      for (const { original, snapshot } of swaps) {
        snapshot.replaceWith(original);
      }
    };

    renderer.once('afterRender', () => {
      for (const original of sourceCanvases) {
        const snapshot = document.createElement('canvas');
        snapshot.width = original.width;
        snapshot.height = original.height;
        snapshot.className = original.className;
        snapshot.style.cssText = original.style.cssText;
        const ctx = snapshot.getContext('2d');
        if (ctx) {
          try {
            ctx.drawImage(original, 0, 0);
          } catch {
            // ignore — best-effort snapshot
          }
        }
        original.replaceWith(snapshot);
        swaps.push({ original, snapshot });
      }

      domToPng(target, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then(dataUrl => {
        finishCapture();
        this.triggerDownload(dataUrl);
        cleanup();
      }).catch(error => {
        finishCapture();
        console.warn('Unable to export graph image.', error);
        cleanup();
      });
    });

    try {
      renderer.refresh();
    } catch (error) {
      finishCapture();
      console.warn('Unable to refresh graph for export.', error);
      cleanup();
    }
  }

  private triggerDownload(dataUrl: string): void {
    const safeName = (this.data.patchName ?? 'patch')
      .trim()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'patch';
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${safeName}-graph.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
