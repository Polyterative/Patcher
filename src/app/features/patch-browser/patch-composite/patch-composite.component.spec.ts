import { PatchCompositeComponent } from './patch-composite.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { defaultPatchMinimalViewConfig } from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { Subject } from 'rxjs';

function mockDataService(): PatchDetailDataService {
  return {
    requestNoteSync$: new Subject()
  } as unknown as PatchDetailDataService;
}

describe('PatchCompositeComponent', () => {
  let comp: PatchCompositeComponent;

  beforeEach(() => {
    comp = new PatchCompositeComponent(mockDataService());
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('isEditing defaults to false', () => {
      expect(comp.isEditing).toBeFalse();
    });

    it('viewConfig defaults to defaultPatchMinimalViewConfig', () => {
      expect(comp.viewConfig).toEqual(defaultPatchMinimalViewConfig);
    });
  });

  describe('buildStatRows', () => {
    const stats = {
      totalCables: 10,
      uniqueModules: 5,
      multiplesCount: 2,
      avgCablesPerModule: 2,
      annotatedConnections: 3
    };

    it('returns a 2D array with one group', () => {
      const rows = comp.buildStatRows(stats);
      expect(rows.length).toBe(1);
      expect(rows[0].length).toBe(1);
    });

    it('group title is "Patch statistics"', () => {
      const rows = comp.buildStatRows(stats);
      expect(rows[0][0].title).toBe('Patch statistics');
    });

    it('items include Cables count', () => {
      const rows = comp.buildStatRows(stats);
      const cables = rows[0][0].items.find(i => i.label === 'Cables');
      expect(cables?.value).toBe('10');
    });

    it('Multiples hidden when multiplesCount=0', () => {
      const s = { ...stats, multiplesCount: 0 };
      const rows = comp.buildStatRows(s);
      const multiples = rows[0][0].items.find(i => i.label === 'Multiples');
      expect(multiples?.hidden).toBeTrue();
    });

    it('Annotated hidden when annotatedConnections=0', () => {
      const s = { ...stats, annotatedConnections: 0 };
      const rows = comp.buildStatRows(s);
      const ann = rows[0][0].items.find(i => i.label === 'Annotated');
      expect(ann?.hidden).toBeTrue();
    });

    it('Multiples visible when multiplesCount>0', () => {
      const rows = comp.buildStatRows(stats);
      const multiples = rows[0][0].items.find(i => i.label === 'Multiples');
      expect(multiples?.hidden).toBeFalse();
    });
  });
});
