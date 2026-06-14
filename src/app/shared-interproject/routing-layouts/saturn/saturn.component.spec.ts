import { ActivatedRoute, Data } from '@angular/router';
import { SaturnComponent } from './saturn.component';

describe('SaturnComponent', () => {
  let comp: SaturnComponent;
  let mockRoute: ActivatedRoute;

  const makeComp = (data: Data = {}): SaturnComponent => {
    mockRoute = { snapshot: { data } } as ActivatedRoute;
    return new SaturnComponent(mockRoute);
  };

  it('creates without error', () => {
    comp = makeComp();
    expect(comp).toBeTruthy();
  });

  it('title is undefined before ngOnInit', () => {
    comp = makeComp();
    expect(comp.title).toBeUndefined();
  });

  it('ngOnInit sets title from route data', () => {
    comp = makeComp({ title: 'Saturn Page' });
    comp.ngOnInit();
    expect(comp.title).toBe('Saturn Page');
  });

  it('ngOnInit leaves title undefined when no route title', () => {
    comp = makeComp({});
    comp.ngOnInit();
    expect(comp.title).toBeUndefined();
  });

  it('ngOnInit does not overwrite manual title', () => {
    comp = makeComp({ title: 'Route Title' });
    comp.title = 'My Title';
    comp.ngOnInit();
    expect(comp.title).toBe('My Title');
  });
});
