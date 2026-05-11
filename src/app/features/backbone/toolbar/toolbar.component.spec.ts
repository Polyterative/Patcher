import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { ToolbarComponent } from './toolbar.component';
import { ToolbarModule } from './toolbar.module';
import { ToolbarService } from './toolbar.service';


function layoutState(overrides: Partial<{
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  ltsm: boolean;
  ltmd: boolean;
  ltlg: boolean;
  ltxl: boolean;
  gtxs: boolean;
  gtsm: boolean;
  gtmd: boolean;
  gtlg: boolean;
}> = {}) {
  return {
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    ltsm: false,
    ltmd: false,
    ltlg: false,
    ltxl: false,
    gtxs: false,
    gtsm: false,
    gtmd: false,
    gtlg: false,
    ...overrides
  };
}

describe('ToolbarComponent', () => {
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(async () => {
    const layoutFlexWidth$ = new BehaviorSubject(layoutState({gtxs: true, gtsm: true, gtmd: true}));

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        ToolbarModule
      ],
      providers: [
        ToolbarService,
        {
          provide: AppStateService,
          useValue: {
            isDev: false,
            layoutFlexWidth$
          }
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$: of(undefined),
            loggedUserFullProfile$: of(undefined),
            isAdmin$: of(false)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    fixture.detectChanges();
  });

  it('keeps the horizontal top toolbar outside the large-screen breakpoint', () => {
    expect(fixture.nativeElement.querySelector('mat-toolbar.toolbar--top.sticky')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Modules');
  });

  it('keeps the shared top-toolbar navigation readable for large-screen shells too', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mat-toolbar.toolbar--top.sticky')).not.toBeNull();
    expect(host.querySelector('.toolbar--side')).toBeNull();
    expect(host.textContent).toContain('Modules');
    expect(host.textContent).toContain('Racks');
  });
});
