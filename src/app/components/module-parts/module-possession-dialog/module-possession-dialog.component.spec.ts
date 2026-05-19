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

    expect(dialogRef.close).toHaveBeenCalledWith('SELLS');
  });
});
