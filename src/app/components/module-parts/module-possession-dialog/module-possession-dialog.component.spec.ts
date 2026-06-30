import { ModulePossessionDialogComponent } from './module-possession-dialog.component';
import { UserModulePossessionKind } from 'src/app/models/module';

describe('ModulePossessionDialogComponent', () => {
  function build(initialKind: UserModulePossessionKind | null = null) {
    const dialogRef = {close: jasmine.createSpy('close')};
    const component = new ModulePossessionDialogComponent(
      dialogRef as any,
      {module: {id: 42, name: 'Maths', manufacturer: {name: 'Make Noise'}}, initialKind} as any
    );
    return {component, dialogRef};
  }

  it('offers owned, wanted, and for-sale choices', () => {
    const {component} = build();

    expect(component.choices.map(choice => choice.kind)).toEqual(['HAS', 'WANTS', 'SELLS']);
  });

  it('defaults acquisition source to new', () => {
    const {component} = build();

    expect(component.source).toBe('new');
  });

  it('preselects the existing state when managing a module collection status', () => {
    const {component} = build('WANTS');

    expect(component.selectedKind).toBe('WANTS');
    expect(component.title).toBe('Manage collection status');
    expect(component.intro).toContain('Change how this module belongs');
    expect(component.removeLabel).toBe('Remove wanted');
  });

  it('uses status-specific remove labels', () => {
    expect(build('HAS').component.removeLabel).toBe('Remove owned');
    expect(build('WANTS').component.removeLabel).toBe('Remove wanted');
    expect(build('SELLS').component.removeLabel).toBe('Remove for sale');
    expect(build().component.removeLabel).toBe('Remove status');
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

  it('returns null when removing an existing status', () => {
    const {component, dialogRef} = build('HAS');

    component.remove();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
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
        source: 'new'
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
