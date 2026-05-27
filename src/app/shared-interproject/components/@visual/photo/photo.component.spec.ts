import { PhotoComponent } from './photo.component';
import { BehaviorSubject, Subject } from 'rxjs';

describe('PhotoComponent', () => {
  let comp: PhotoComponent;
  let mockDataService: any;
  let mockAppState: any;

  beforeEach(() => {
    mockDataService = {
      url$: new BehaviorSubject<string>(''),
      loadUnsplash$: new Subject<string>()
    };
    mockAppState = {};

    comp = new PhotoComponent(mockDataService, mockAppState);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('default theme is "clean"', () => {
    expect(comp.theme).toBe('clean');
  });

  it('setting path calls dataService.url$.next', () => {
    spyOn(mockDataService.url$, 'next');
    comp.path = 'https://example.com/photo.jpg';
    expect(mockDataService.url$.next).toHaveBeenCalledWith('https://example.com/photo.jpg');
  });

});
