import { DialogInfoBoxComponent } from './dialog-info-box.component';

describe('DialogInfoBoxComponent', () => {
  let comp: DialogInfoBoxComponent;

  beforeEach(() => { comp = new DialogInfoBoxComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('icon defaults to 💡', () => {
    expect(comp.icon).toBe('💡');
  });

  it('title defaults to empty string', () => {
    expect(comp.title).toBe('');
  });

  it('items defaults to empty array', () => {
    expect(comp.items).toEqual([]);
  });
});
