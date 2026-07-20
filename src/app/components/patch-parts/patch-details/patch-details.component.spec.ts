import { PatchDetailsComponent } from './patch-details.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { Subject } from 'rxjs';

function mockDataService(): PatchDetailDataService {
  return {
    requestNoteSync$: new Subject()
  } as unknown as PatchDetailDataService;
}

describe('PatchDetailsComponent', () => {
  let comp: PatchDetailsComponent;

  beforeEach(() => {
    comp = new PatchDetailsComponent(mockDataService());
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('isEditing defaults to false', () => {
    expect(comp.isEditing).toBeFalse();
  });

  it('showConnectionsList defaults to true', () => {
    expect(comp.showConnectionsList).toBeTrue();
  });

  it('switches defaults to empty array', () => {
    expect(comp.switches).toEqual([]);
  });

  it('ngOnInit does not throw', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('exposes PatchDetailDataService for template bindings without a backend dependency', () => {
    const dataService = mockDataService();

    comp = new PatchDetailsComponent(dataService);

    expect(comp.dataService).toBe(dataService);
  });
});
