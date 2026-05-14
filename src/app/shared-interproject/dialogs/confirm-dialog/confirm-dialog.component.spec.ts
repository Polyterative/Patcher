import { ConfirmDialogComponent } from './confirm-dialog.component';


describe('ConfirmDialogComponent', () => {
  it('copies positive and negative labels from dialog data', () => {
    const data = {
      title: 'Delete',
      description: 'Are you sure?',
      positive: {label: 'yes'},
      negative: {label: 'no'}
    };
    
    const component = new ConfirmDialogComponent({} as any, data as any);
    
    expect(component.title).toBe('Delete');
    expect(component.description).toBe('Are you sure?');
    expect(component.positive).toEqual({label: 'yes'});
    expect(component.negative).toEqual({label: 'no'});
  });

  it('leaves positive and negative undefined when not provided in dialog data', () => {
    const data = {title: 'Warning', description: 'Something happened'};
    const component = new ConfirmDialogComponent({} as any, data as any);
    expect(component.positive).toBeUndefined();
    expect(component.negative).toBeUndefined();
  });

  it('still sets title and description when positive/negative are omitted', () => {
    const data = {title: 'Confirm', description: 'Proceed?'};
    const component = new ConfirmDialogComponent({} as any, data as any);
    expect(component.title).toBe('Confirm');
    expect(component.description).toBe('Proceed?');
  });

  it('data property references the original dialog data', () => {
    const data = {title: 'Check', description: 'desc'};
    const component = new ConfirmDialogComponent({} as any, data as any);
    expect(component.data).toBe(data);
  });
});