import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                     from 'rxjs';

interface UnsplashResponse {
  urls: {
    regular: string;
  };
}

@Injectable()
export class PhotosService {
  protected destroyEvent$: Subject<void> = new Subject();
  public readonly url$ = new BehaviorSubject<string>('');
  public readonly loadUnsplash$ = new Subject<string>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  constructor(private http: HttpClient) {
    
    // this.loadUnsplash$
    //     .pipe(
    //       switchMap(x =>{})
    //     )
    //     .subscribe(value => {
    //
    //     });
  }
  
  
}
