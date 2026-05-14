import { UranusComponent } from './uranus.component';

describe('UranusComponent', () => {
  let comp: UranusComponent;
  let mockRoute: { snapshot: { data: Record<string, unknown> } };

  const makeComp = (data: Record<string, unknown> = {}): UranusComponent => {
    mockRoute = { snapshot: { data } };
    return new UranusComponent(mockRoute as any);
  };

  it('creates without error', () => {
    comp = makeComp();
    expect(comp).toBeTruthy();
  });

  it('title is undefined before ngOnInit', () => {
    comp = makeComp();
    expect(comp.title).toBeUndefined();
  });

  it('ngOnInit sets title from route data when provided', () => {
    comp = makeComp({ title: 'My Page' });
    comp.ngOnInit();
    expect(comp.title).toBe('My Page');
  });

  it('ngOnInit leaves title undefined when route data has no title', () => {
    comp = makeComp({});
    comp.ngOnInit();
    expect(comp.title).toBeUndefined();
  });

  it('ngOnInit does not overwrite an already-set title', () => {
    comp = makeComp({ title: 'Route Title' });
    comp.title = 'Manual Title';
    comp.ngOnInit();
    expect(comp.title).toBe('Manual Title');
  });
});
