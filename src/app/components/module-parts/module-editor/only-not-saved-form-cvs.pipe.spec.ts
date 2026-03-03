import { UntypedFormControl } from '@angular/forms';
import { OnlyNotSavedFormCVsLengthPipe } from './only-not-saved-form-cvs.pipe';
import { FormCV } from './module-editor-data.service';


function makeFormCV(id: number): FormCV {
  return {id, name: new UntypedFormControl('CV'), a: new UntypedFormControl(false), b: new UntypedFormControl(false), isApproved: id !== 0};
}


describe('OnlyNotSavedFormCVsLengthPipe', () => {
  let pipe: OnlyNotSavedFormCVsLengthPipe;
  
  beforeEach(() => {
    pipe = new OnlyNotSavedFormCVsLengthPipe();
  });
  
  it('returns 0 for empty array', () => {
    expect(pipe.transform([])).toBe(0);
  });
  
  it('returns count of CVs with id === 0 (not yet saved)', () => {
    expect(pipe.transform([makeFormCV(0), makeFormCV(0), makeFormCV(5)])).toBe(2);
  });
  
  it('returns 0 when all CVs are already saved', () => {
    expect(pipe.transform([makeFormCV(1), makeFormCV(2), makeFormCV(3)])).toBe(0);
  });
  
  it('returns 1 for single unsaved CV', () => {
    expect(pipe.transform([makeFormCV(0)])).toBe(1);
  });
  
  it('returns total count when all CVs are unsaved', () => {
    expect(pipe.transform([makeFormCV(0), makeFormCV(0), makeFormCV(0)])).toBe(3);
  });
});