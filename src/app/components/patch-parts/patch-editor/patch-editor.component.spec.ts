import { PatchEditorComponent } from './patch-editor.component';


describe('PatchEditorComponent', () => {
  it('should hide module tags in patch editor cards to keep the editor compact', () => {
    const component = new PatchEditorComponent({} as any, {} as any);
    
    expect(component.modulesViewConfig.hideTags).toBeTrue();
  });
});