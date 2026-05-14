import { PatchConnectionsListComponent } from './patch-connections-list.component';
import { PatchDetailDataService } from '../patch-detail-data.service';
import { Subject } from 'rxjs';
import { PatchConnection } from 'src/app/models/connection';

function mockDataService(): PatchDetailDataService {
  return {
    requestNoteSync$: new Subject<PatchConnection>()
  } as unknown as PatchDetailDataService;
}

describe('PatchConnectionsListComponent', () => {
  let ds: PatchDetailDataService;
  let comp: PatchConnectionsListComponent;

  beforeEach(() => {
    ds = mockDataService();
    comp = new PatchConnectionsListComponent(ds);
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('isEditing defaults to false', () => {
      expect(comp.isEditing).toBeFalse();
    });

    it('reverseOrder defaults to false', () => {
      expect(comp.reverseOrder).toBeFalse();
    });

    it('instanceLabelMap defaults to empty Map', () => {
      expect(comp.instanceLabelMap).toEqual(new Map());
    });
  });

  describe('effectiveNoteSync$', () => {
    it('returns undefined when not editing', () => {
      comp.isEditing = false;
      expect(comp.effectiveNoteSync$).toBeUndefined();
    });

    it('returns dataService.requestNoteSync$ when editing', () => {
      comp.isEditing = true;
      expect(comp.effectiveNoteSync$).toBe(ds.requestNoteSync$);
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });
});
