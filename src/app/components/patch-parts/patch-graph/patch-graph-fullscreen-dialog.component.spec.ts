import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { GraphViewService } from 'src/app/shared-interproject/components/@visual/graph-view/graph-view.service';
import { PatchDetailDataService } from '../patch-detail-data.service';
import { PatchGraphComponent } from './patch-graph.component';
import {
  PatchGraphFullscreenDialogComponent,
  PatchGraphFullscreenDialogData
} from './patch-graph-fullscreen-dialog.component';


describe('PatchGraphFullscreenDialogComponent', () => {
  let fixture: ComponentFixture<PatchGraphFullscreenDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PatchGraphFullscreenDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<PatchGraphFullscreenDialogComponent>>(
      'MatDialogRef',
      ['close'],
      {beforeClosed: () => of(undefined)}
    );
    spyOnProperty(document, 'fullscreenEnabled', 'get').and.returnValue(false);

    await TestBed.configureTestingModule({
      declarations: [PatchGraphFullscreenDialogComponent],
      imports: [NoopAnimationsModule],
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            nodes: [],
            edges: [],
            legend: [{label: 'Module', color: '#8974E4'}]
          } satisfies PatchGraphFullscreenDialogData
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PatchGraphFullscreenDialogComponent);
    fixture.detectChanges();
  });

  it('renders the graph legend snapshot', () => {
    expect(fixture.nativeElement.textContent).toContain('Module');
  });

  it('closes from the top-right action', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});

describe('PatchGraphComponent fullscreen action', () => {
  it('opens the fullscreen dialog with a read-only graph snapshot', () => {
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const dialogRef = {
      afterClosed: () => of(undefined)
    } as MatDialogRef<PatchGraphFullscreenDialogComponent>;
    spyOnProperty(document, 'fullscreenEnabled', 'get').and.returnValue(false);
    dialog.open.and.returnValue(dialogRef);

    const component = new PatchGraphComponent(
      {} as PatchDetailDataService,
      {} as SupabaseService,
      {} as GraphViewService,
      dialog
    );

    component.openFullscreenGraph();

    expect(dialog.open).toHaveBeenCalledWith(
      PatchGraphFullscreenDialogComponent,
      jasmine.objectContaining({
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        data: jasmine.objectContaining({
          nodes: [],
          edges: [],
          legend: jasmine.arrayContaining([
            jasmine.objectContaining({label: 'Module'})
          ])
        })
      })
    );
  });
});
