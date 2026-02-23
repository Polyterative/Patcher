import { UntypedFormControl } from '@angular/forms';
import { FormCV } from '../module-editor.component';
import { ModuleEditorCvFormLineComponent } from './module-editor-cv-form-line.component';

function makeFormCV(partial: Partial<FormCV> = {}): FormCV {
  return {
    id: partial.id ?? 1,
    isApproved: partial.isApproved ?? false,
    name: partial.name ?? new UntypedFormControl('CV Name'),
    a: partial.a ?? new UntypedFormControl(0),
    b: partial.b ?? new UntypedFormControl(5)
  };
}

describe('ModuleEditorCvFormLineComponent', () => {
  it('should mark new rows as removable draft rows', () => {
    const component = new ModuleEditorCvFormLineComponent();
    component.item = makeFormCV({id: 0, isApproved: false});

    expect(component.isRemovable).toBeTrue();
    expect(component.statusLabel).toBe('Draft');
    expect(component.actionIcon).toBe('delete_outline');
    expect(component.actionAriaLabel).toBe('Remove unsaved CV row');
    expect(component.actionTooltip).toContain('unsaved CV row');
  });

  it('should mark approved stored rows as locked approved rows', () => {
    const component = new ModuleEditorCvFormLineComponent();
    component.item = makeFormCV({id: 23, isApproved: true});

    expect(component.isRemovable).toBeFalse();
    expect(component.statusLabel).toBe('Approved');
    expect(component.actionIcon).toBe('check_circle');
    expect(component.actionAriaLabel).toBe('CV row is locked');
    expect(component.actionTooltip).toContain('cannot be removed');
  });

  it('should mark non-approved stored rows as locked saved rows', () => {
    const component = new ModuleEditorCvFormLineComponent();
    component.item = makeFormCV({id: 11, isApproved: false});

    expect(component.isRemovable).toBeFalse();
    expect(component.statusLabel).toBe('Saved');
    expect(component.actionIcon).toBe('lock');
    expect(component.actionAriaLabel).toBe('CV row is locked');
  });

  it('should emit remove request only for removable rows', () => {
    const component = new ModuleEditorCvFormLineComponent();
    const emitSpy = spyOn(component.removeRequest$, 'next');

    component.item = makeFormCV({id: 0});
    component.requestRemove();
    expect(emitSpy).toHaveBeenCalledTimes(1);

    component.item = makeFormCV({id: 77});
    component.requestRemove();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
