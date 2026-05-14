import { GeneralContextMenuComponent } from './general-context-menu.component';
import { GeneralContextMenuDataService } from './general-context-menu-data.service';
import { Subject, BehaviorSubject } from 'rxjs';

function mockDataService(): GeneralContextMenuDataService {
  return {
    open$: new Subject<MouseEvent>(),
    positionData$: new BehaviorSubject({ x: '0px', y: '0px' }),
    clampPosition: jasmine.createSpy('clampPosition').and.returnValue({ x: '0.625rem', y: '1.25rem' }),
    menuItems$: new BehaviorSubject([]),
    menuClose$: new Subject<void>()
  } as unknown as GeneralContextMenuDataService;
}

describe('GeneralContextMenuComponent', () => {
  let ds: GeneralContextMenuDataService;
  let comp: GeneralContextMenuComponent;

  beforeEach(() => {
    ds = mockDataService();
    comp = new GeneralContextMenuComponent(ds);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(ds);
  });

  describe('ngOnInit', () => {
    it('does not throw when contextMenu is undefined (ViewChild not yet set)', () => {
      // contextMenu is set via @ViewChild at runtime; in unit test it's undefined
      // ngOnInit subscribes but openMenu() would only be called on open$ emission
      // so no-throw is sufficient to verify subscription wiring
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });
});
