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
});