import { BehaviorSubject, Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UserManualsComponent } from './user-manuals.component';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import {
  createMockAppShellLayoutService,
  createMockAppStateService
} from '../__tests__/test-setup';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';

describe('UserManualsComponent', () => {
  function build() {
    const manualsData$ = new BehaviorSubject<any[] | undefined>([
      {id: 1, name: 'Belgrad', manualURL: 'https://manuals/belgrad'},
      {id: 2, name: 'Dixie II+', manualURL: 'https://manuals/dixie'}
    ]);
    const filteredManualsData$ = new BehaviorSubject<any[] | undefined>(manualsData$.value);
    const hasSearchQuery$ = new BehaviorSubject(false);
    const updateManualsData$ = new Subject<void>();
    spyOn(updateManualsData$, 'next').and.callThrough();

    TestBed.configureTestingModule({
      imports: [UserManualsComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: UserAreaDataService,
          useValue: {
            manualsData$,
            filteredManualsData$,
            hasSearchQuery$,
            updateManualsData$,
          }
        },
        {
          provide: AppStateService,
          useValue: createMockAppStateService()
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$: new BehaviorSubject<any>(null),
            loggedUserFullProfile$: new BehaviorSubject<any>(null)
          }
        },
        {
          provide: AppShellLayoutService,
          useValue: createMockAppShellLayoutService()
        },
        {
          provide: Window,
          useValue: window
        },
        {
          provide: Document,
          useValue: document
        },
        {
          provide: Location,
          useValue: location
        },
        {
          provide: Navigator,
          useValue: navigator
        },
        {
          provide: History,
          useValue: history
        },
        {
          provide: Screen,
          useValue: screen
        },
        {
          provide: Storage,
          useValue: localStorage
        },
        {
          provide: URL,
          useValue: URL
        },
        {
          provide: URLSearchParams,
          useValue: URLSearchParams
        },
        {
          provide: HTMLElement,
          useValue: HTMLElement
        },
        {
          provide: Node,
          useValue: Node
        },
        {
          provide: Event,
          useValue: Event
        },
        {
          provide: MouseEvent,
          useValue: MouseEvent
        },
        {
          provide: KeyboardEvent,
          useValue: KeyboardEvent
        },
        {
          provide: CustomEvent,
          useValue: CustomEvent
        },
        {
          provide: Element,
          useValue: Element
        },
        {
          provide: HTMLAnchorElement,
          useValue: HTMLAnchorElement
        },
        {
          provide: HTMLDivElement,
          useValue: HTMLDivElement
        },
        {
          provide: HTMLButtonElement,
          useValue: HTMLButtonElement
        },
        {
          provide: HTMLInputElement,
          useValue: HTMLInputElement
        },
        {
          provide: HTMLImageElement,
          useValue: HTMLImageElement
        },
        {
          provide: SVGElement,
          useValue: SVGElement
        },
        {
          provide: DOMRect,
          useValue: DOMRect
        },
        {
          provide: ResizeObserver,
          useValue: class {
            observe() {}
            disconnect() {}
            unobserve() {}
          }
        }
      ]
    });

    const fixture = TestBed.createComponent(UserManualsComponent);
    fixture.detectChanges();

    return {
      fixture,
      dataService: TestBed.inject(UserAreaDataService) as any,
      manualsData$,
      filteredManualsData$,
      hasSearchQuery$,
      updateManualsData$,
    };
  }

  it('renders only manuals matching the global search', () => {
    const {fixture, filteredManualsData$} = build();

    filteredManualsData$.next([
      {id: 2, name: 'Dixie II+', manualURL: 'https://manuals/dixie'}
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Dixie II+');
    expect(text).not.toContain('Belgrad');
  });

  it('shows a search-specific empty state when no manuals match', () => {
    const {fixture, filteredManualsData$, hasSearchQuery$} = build();

    hasSearchQuery$.next(true);
    filteredManualsData$.next([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No manuals match the current search');
  });

  it('requests manuals on init', () => {
    const {updateManualsData$} = build();

    expect(updateManualsData$.next).toHaveBeenCalled();
  });
});
