import { HeroInfoBoxComponent } from './hero-info-box.component';
import { HeroInfoBoxService } from './hero-info-box.service';
import { BehaviorSubject, Subject } from 'rxjs';

function mockService(): HeroInfoBoxService {
  return {
    infoText$: new BehaviorSubject(''),
    hoverStart$: new Subject<string>(),
    hoverEnd$: new Subject<string>()
  } as unknown as HeroInfoBoxService;
}

describe('HeroInfoBoxComponent', () => {
  let comp: HeroInfoBoxComponent;
  let service: HeroInfoBoxService;

  beforeEach(() => {
    service = mockService();
    comp = new HeroInfoBoxComponent(service);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(service);
  });

  it('ngOnInit does not throw', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
