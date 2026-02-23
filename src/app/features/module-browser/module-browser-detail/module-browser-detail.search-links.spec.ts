import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { ModuleBrowserDetailComponent } from './module-browser-detail.component';


describe('ModuleBrowserDetailComponent search links', () => {
  function build() {
    const routeParams$ = new Subject<any>();
    const component = new ModuleBrowserDetailComponent(
      {
        singleModuleData$: new BehaviorSubject<any>(undefined),
        updateSingleModuleData$: new Subject<number>(),
        changeModule$: new Subject<any>(),
        requestModuleEditingToggle$: new Subject<void>()
      } as any,
      {params: routeParams$.asObservable()} as any,
      jasmine.createSpyObj('Router', ['navigate']),
      {updateSeo: jasmine.createSpy('updateSeo')} as any,
      {} as any,
      {requestCommentsUpdate$: {next: jasmine.createSpy('comments.next')}, requestReset$: {next: jasmine.createSpy('reset.next')}} as any,
      {} as any
    );
    return {component};
  }
  
  it('builds URLs for every configured search link', () => {
    const {component} = build();
    const urls = component.searchLinks.map(link => link.url('Maths', 'Make Noise'));
    
    expect(urls.length).toBe(component.searchLinks.length);
    urls.forEach(url => expect(url).toContain('Maths'));
    expect(urls.some(url => url.includes('youtube.com'))).toBeTrue();
    expect(urls.some(url => url.includes('modulargrid.net'))).toBeTrue();
    expect(urls.some(url => url.includes('perfectcircuit.com'))).toBeTrue();
  });
});