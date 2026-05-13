import { BehaviorSubject } from 'rxjs';
import { UntypedFormControl } from '@angular/forms';
import { ModuleBrowserAdderComponent } from './module-browser-adder.component';


describe('ModuleBrowserAdderComponent', () => {
  function build(initialQueryParams: any = {}) {
    const queryParams$ = new BehaviorSubject<any>(initialQueryParams);
    const manufacturerOptions$ = new BehaviorSubject<any[]>([]);
    const standardOptions$ = new BehaviorSubject<any[]>([]);
    
    const manufacturerControl = new UntypedFormControl('');
    const standardControl = new UntypedFormControl('');
    const hpControl = new UntypedFormControl('8');
    
    const dataService = {
      formData: {
        manufacturer: {
          control: manufacturerControl,
          options$: manufacturerOptions$.asObservable()
        },
        standard: {
          control: standardControl,
          options$: standardOptions$.asObservable()
        },
        hp: {
          control: hpControl
        }
      }
    };
    
    const route = {queryParams: queryParams$.asObservable()};
    const seoAndUtilsService = {updateSeo: jasmine.createSpy('updateSeo')};
    const userService = {};
    
    const component = new ModuleBrowserAdderComponent(
      dataService as any,
      route as any,
      seoAndUtilsService as any,
      userService as any
    );
    
    return {
      component,
      queryParams$,
      manufacturerOptions$,
      standardOptions$,
      manufacturerControl,
      standardControl,
      hpControl,
      seoAndUtilsService
    };
  }
  
  // ─── Static properties ───────────────────────────────────────────────────────
  
  it('has exactly 5 guidelines items', () => {
    const {component} = build();
    expect(component.guidelinesData.length).toBe(5);
  });
  
  it('each guideline item has label, value and icon', () => {
    const {component} = build();
    for (const item of component.guidelinesData) {
      expect(item.label).toBeTruthy();
      expect(item.value).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });
  
  it('viewConfig hides tags and buttons but shows dates', () => {
    const {component} = build();
    expect(component.viewConfig.hideTags).toBeTrue();
    expect(component.viewConfig.hideButtons).toBeTrue();
    expect(component.viewConfig.hideDates).toBeFalse();
  });
  
  it('ignoreSeo defaults to false', () => {
    const {component} = build();
    expect(component.ignoreSeo).toBeFalse();
  });
  
  // ─── SEO ─────────────────────────────────────────────────────────────────────
  
  it('calls updateSeo with Submit a module title on ngOnInit', () => {
    const {component, seoAndUtilsService} = build();
    component.ngOnInit();
    expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
      jasmine.objectContaining({title: 'Submit a module'}),
      'Submit a module'
    );
  });
  
  // ─── Destroy ─────────────────────────────────────────────────────────────────
  
  it('ngOnDestroy completes destroy$', () => {
    const {component} = build();
    let completed = false;
    component.destroy$.subscribe({complete: () => (completed = true)});
    component.ngOnDestroy();
    expect(completed).toBeTrue();
  });
  
  it('ngOnDestroy unsubscribes from query param combineLatest', (done) => {
    const {component, manufacturerOptions$, standardOptions$, manufacturerControl} = build({manufacturer: '1'});
    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    // Destroy before the 200ms delay fires
    component.ngOnDestroy();
    
    // After the delay would have fired, the control should still be at its initial value
    setTimeout(() => {
      expect(manufacturerControl.value).toBe('');
      done();
    }, 250);
  });
  
  // ─── Query param prefilling ──────────────────────────────────────────────────
  
  it('prefills manufacturer control from query params when found in options', (done) => {
    const {component, manufacturerOptions$, standardOptions$, manufacturerControl} =
      build({manufacturer: '2'});
    
    component.ngOnInit();
    manufacturerOptions$.next([
      {id: '1', name: 'Doepfer'},
      {id: '2', name: 'Make Noise'}
    ]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    setTimeout(() => {
      expect(manufacturerControl.value).toEqual({id: '2', name: 'Make Noise'});
      done();
    }, 250);
  });
  
  it('prefills HP control from query params', (done) => {
    const {component, manufacturerOptions$, standardOptions$, hpControl} =
      build({HP: '14'});
    
    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    setTimeout(() => {
      expect(hpControl.value).toBe(14);
      done();
    }, 250);
  });
  
  it('prefills standard control from query params when found in options', (done) => {
    const {component, manufacturerOptions$, standardOptions$, standardControl} =
      build({standard: '1'});

    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    // ids are strings — matching real service output (y.id.toString())
    standardOptions$.next([
      {id: '0', name: '3U'},
      {id: '1', name: 'Frac'}
    ]);
    
    setTimeout(() => {
      expect(standardControl.value).toEqual({id: '1', name: 'Frac'});
      done();
    }, 250);
  });
  
  it('does not prefill manufacturer when param is not a valid integer', (done) => {
    const {component, manufacturerOptions$, standardOptions$, manufacturerControl} =
      build({manufacturer: 'abc'});
    
    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    setTimeout(() => {
      expect(manufacturerControl.value).toBe('');
      done();
    }, 250);
  });
  
  it('does not prefill HP when param is not a valid integer', (done) => {
    const {component, manufacturerOptions$, standardOptions$, hpControl} =
      build({HP: 'not-a-number'});
    
    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    setTimeout(() => {
      expect(hpControl.value).toBe('8');
      done();
    }, 250);
  });
  
  it('does not prefill manufacturer when id is not found in options', (done) => {
    const {component, manufacturerOptions$, standardOptions$, manufacturerControl} =
      build({manufacturer: '99'});
    
    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    setTimeout(() => {
      // find returns undefined → patchValue(undefined)
      expect(manufacturerControl.value).toBeUndefined();
      done();
    }, 250);
  });
  
  it('does not apply any prefilling when no query params are present', (done) => {
    const {component, manufacturerOptions$, standardOptions$, manufacturerControl, hpControl} =
      build({});
    
    component.ngOnInit();
    manufacturerOptions$.next([{id: '1', name: 'Doepfer'}]);
    standardOptions$.next([{id: '0', name: '3U'}]);
    
    setTimeout(() => {
      expect(manufacturerControl.value).toBe('');
      expect(hpControl.value).toBe('8');
      done();
    }, 250);
  });
});