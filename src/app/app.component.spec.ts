import {
  Component,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { NavigationStart, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { AppShellLayoutService } from './shared-interproject/app-shell-layout.service';
import { AppViewportService } from './shared-interproject/app-viewport.service';


@Component({
  selector: 'app-toolbar',
  template: '',
  standalone: false
})
class ToolbarStubComponent {
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let wideShell$: BehaviorSubject<boolean>;
  let routerEvents$: Subject<unknown>;
  let routerMock: { events: Subject<unknown>; url: string };

  beforeEach(async () => {
    wideShell$ = new BehaviorSubject(false);
    routerEvents$ = new Subject<unknown>();
    routerMock = {
      events: routerEvents$,
      url: '/home'
    };
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    });

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      declarations: [
        AppComponent,
        ToolbarStubComponent
      ],
      providers: [
        {
          provide: Router,
          useValue: routerMock
        },
        {
          provide: AppViewportService,
          useValue: {
            initialize: jasmine.createSpy('initialize')
          }
        },
        {
          provide: AppShellLayoutService,
          useValue: {
            wideShell$
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('applies the shared wide-shell class and removes the legacy toolbar on desktop shells', () => {
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeFalse();
    expect(fixture.debugElement.query(By.directive(ToolbarStubComponent))).not.toBeNull();

    wideShell$.next(true);
    fixture.detectChanges();

    expect(shell.classList.contains('app-shell--wide')).toBeTrue();
    expect(fixture.debugElement.query(By.directive(ToolbarStubComponent))).toBeNull();
  });

  it('keeps the legacy toolbar when the current route does not provide an embedded shell', () => {
    routerMock.url = '/auth/login';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeFalse();
    expect(fixture.debugElement.query(By.directive(ToolbarStubComponent))).not.toBeNull();
  });

  it('shows the route loading state during navigation starts', () => {
    fixture.detectChanges();
    routerEvents$.next(new NavigationStart(1, '/modules/browser'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading page');
  });
});
