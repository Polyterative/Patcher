import { ActivatedRoute, Data } from '@angular/router';
import { VenusComponent } from './venus.component';

describe('VenusComponent', () => {
  let comp: VenusComponent;
  let mockRoute: ActivatedRoute;

  const makeComp = (data: Data = {}): VenusComponent => {
    mockRoute = { snapshot: { data } } as ActivatedRoute;
    return new VenusComponent(mockRoute);
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
    comp = makeComp({ title: 'Venus Page' });
    comp.ngOnInit();
    expect(comp.title).toBe('Venus Page');
  });

  it('ngOnInit leaves title undefined when route data has no title', () => {
    comp = makeComp({});
    comp.ngOnInit();
    expect(comp.title).toBeUndefined();
  });

  it('ngOnInit does not overwrite a manually-set title', () => {
    comp = makeComp({ title: 'Route Title' });
    comp.title = 'Custom Title';
    comp.ngOnInit();
    expect(comp.title).toBe('Custom Title');
  });
});
