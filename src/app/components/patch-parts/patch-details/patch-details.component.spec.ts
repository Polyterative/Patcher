import { PatchDetailsComponent } from './patch-details.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Subject } from 'rxjs';

function mockBackend(): SupabaseService {
  return {} as unknown as SupabaseService;
}

function mockDataService(): PatchDetailDataService {
  return {
    requestNoteSync$: new Subject()
  } as unknown as PatchDetailDataService;
}

describe('PatchDetailsComponent', () => {
  let comp: PatchDetailsComponent;

  beforeEach(() => {
    comp = new PatchDetailsComponent(mockBackend(), mockDataService());
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
});
