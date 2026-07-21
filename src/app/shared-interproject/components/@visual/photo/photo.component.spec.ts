import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpClient } from '@angular/common/http';
import { PhotoComponent } from './photo.component';
import { of } from 'rxjs';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { PhotosService } from './photos.service';

describe('PhotoComponent', () => {
  let comp: PhotoComponent;
  let dataService: PhotosService;

  beforeEach(() => {
    const httpClient = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    const breakpointObserver = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);
    const breakpointState: BreakpointState = {matches: false, breakpoints: {}};

    dataService = new PhotosService(httpClient);
    breakpointObserver.observe.and.returnValue(of(breakpointState));

    comp = new PhotoComponent(dataService, new AppStateService(breakpointObserver));
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('default theme is "clean"', () => {
    expect(comp.theme).toBe('clean');
  });

  it('setting path calls dataService.url$.next', () => {
    spyOn(dataService.url$, 'next');
    comp.path = 'https://example.com/photo.jpg';
    expect(dataService.url$.next).toHaveBeenCalledWith('https://example.com/photo.jpg');
  });

});
