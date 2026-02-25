import {
  EditorModuleCard,
  filterEditorCardsByQuery,
  PatchEditorComponent
} from './patch-editor.component';


const createCard = (
  moduleName: string,
  manufacturerName: string,
  id: number
): EditorModuleCard => ({
  module: {
    id,
    name: moduleName,
    manufacturer: {
      name: manufacturerName
    }
  } as any,
  instance: undefined,
  label: undefined,
  instanceCount: 1,
  connectionCount: 0,
  connectionNames: [],
  trackingId: id
});


describe('PatchEditorComponent', () => {
  it('should hide module tags in patch editor cards to keep the editor compact', () => {
    const component = new PatchEditorComponent({} as any, {} as any);
    
    expect(component.modulesViewConfig.hideTags).toBeTrue();
  });
  
  it('returns all cards when search query is empty', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1),
      createCard('Disting mk4', 'Expert Sleepers', 2)
    ];
    
    expect(filterEditorCardsByQuery(cards, '')).toEqual(cards);
  });
  
  it('filters cards by module name and manufacturer', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1),
      createCard('Plaits', 'Mutable Instruments', 2),
      createCard('Disting mk4', 'Expert Sleepers', 3)
    ];
    
    expect(filterEditorCardsByQuery(cards, 'plai').map(card => card.module.id)).toEqual([2]);
    expect(filterEditorCardsByQuery(cards, 'expert').map(card => card.module.id)).toEqual([3]);
  });
  
  it('filters cards using normalized search input', () => {
    const cards = [
      createCard('Instruō Cèis', 'Instruō', 1),
      createCard('Maths', 'Make Noise', 2)
    ];
    
    expect(filterEditorCardsByQuery(cards, 'instruo').map(card => card.module.id)).toEqual([1]);
    expect(filterEditorCardsByQuery(cards, 'ceis').map(card => card.module.id)).toEqual([1]);
  });
});