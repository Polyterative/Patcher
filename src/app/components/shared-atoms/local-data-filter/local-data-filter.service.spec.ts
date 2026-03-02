import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { LocalDataFilterService } from './local-data-filter.service';


describe('LocalDataFilterService', () => {
  let service: LocalDataFilterService;
  
  beforeEach(() => {
    service = new LocalDataFilterService();
  });
  
  afterEach(() => {
    service.ngOnDestroy();
  });
  
  it('initializes search control with empty string', () => {
    expect(service.search.control.value).toBe('');
  });
  
  it('has the correct FormType for search field', () => {
    expect(service.search.type).toBeDefined();
  });
  
  it('filterEvent$ emits after debounce when search control value changes', fakeAsync(() => {
    const emitted: string[] = [];
    service.filterEvent$.subscribe(v => emitted.push(v));
    
    service.search.control.setValue('rings');
    tick(350);
    
    expect(emitted).toEqual(['rings']);
  }));
  
  it('filterEvent$ does not emit before debounce time elapses', fakeAsync(() => {
    const emitted: string[] = [];
    service.filterEvent$.subscribe(v => emitted.push(v));
    
    service.search.control.setValue('rings');
    tick(100);
    
    expect(emitted.length).toBe(0);
  }));
  
  it('filterEvent$ emits only the final value when changed multiple times within debounce window', fakeAsync(() => {
    const emitted: string[] = [];
    service.filterEvent$.subscribe(v => emitted.push(v));
    
    service.search.control.setValue('r');
    tick(100);
    service.search.control.setValue('ri');
    tick(100);
    service.search.control.setValue('rings');
    tick(350);
    
    expect(emitted).toEqual(['rings']);
  }));
  
  it('orderEvent$ emits immediately when order control value changes', fakeAsync(() => {
    const emitted: any[] = [];
    service.orderEvent$.subscribe(v => emitted.push(v));
    
    service.order.control.setValue({id: 'name', name: 'Name ↑'});
    tick();
    
    expect(emitted.length).toBe(1);
    expect(emitted[0].id).toBe('name');
  }));
  
  it('search has label and code defined', () => {
    expect(service.search.label).toBeTruthy();
    expect(service.search.code).toBeTruthy();
  });
  
  it('ngOnDestroy stops filterEvent$ emissions', fakeAsync(() => {
    const emitted: string[] = [];
    service.filterEvent$.subscribe(v => emitted.push(v));
    
    service.ngOnDestroy();
    
    service.search.control.setValue('after-destroy');
    tick(400);
    
    expect(emitted.length).toBe(0);
  }));
});