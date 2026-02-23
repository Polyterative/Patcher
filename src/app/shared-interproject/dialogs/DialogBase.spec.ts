import { DialogBase } from './DialogBase';


describe('DialogBase', () => {
  it('stores title and description from input data', () => {
    const base = new DialogBase({
      title: 'Title',
      description: 'Description'
    });
    
    expect(base.title).toBe('Title');
    expect(base.description).toBe('Description');
  });
  
  it('supports missing optional description', () => {
    const base = new DialogBase({
      title: 'Only title'
    });
    
    expect(base.title).toBe('Only title');
    expect(base.description).toBeUndefined();
  });
});