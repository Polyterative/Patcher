import { ModulePossessionDialogComponent } from './module-possession-dialog.component';

describe('ModulePossessionDialogComponent', () => {
  function build() {
    const dialogRef = {close: jasmine.createSpy('close')};
    const component = new ModulePossessionDialogComponent(
      dialogRef as any,
      {module: {id: 42, name: 'Maths', manufacturer: {name: 'Make Noise'}}} as any
    );
    return {component, dialogRef};
  }

  it('offers owned, wanted, and for-sale choices', () => {
    const {component} = build();

    expect(component.choices.map(choice => choice.kind)).toEqual(['HAS', 'WANTS', 'SELLS']);
  });

  it('does not save without a selected kind', () => {
    const {component, dialogRef} = build();

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('returns the selected kind on save', () => {
    const {component, dialogRef} = build();

    component.select('SELLS');
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({kind: 'SELLS'});
  });

  it('returns only HAS kind when acquisition fields are empty defaults', () => {
    const {component, dialogRef} = build();

    component.select('HAS');
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({kind: 'HAS'});
  });

  it('parses HAS price into minor units with currency', () => {
    const {component, dialogRef} = build();

    component.select('HAS');
    component.priceInput = '123.45';
    component.currency = 'USD';
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      kind: 'HAS',
      acquisition: jasmine.objectContaining({
        price_amount_minor: 12345,
        currency: 'USD',
        source: 'unknown'
      })
    });
  });

  it('keeps dialog open and exposes an error for invalid price input', () => {
    const {component, dialogRef} = build();

    component.select('HAS');
    component.priceInput = '-12';
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.priceError).toBe('Enter a valid non-negative price.');
  });
});
